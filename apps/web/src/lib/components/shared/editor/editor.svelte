<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor, Extension } from '@tiptap/core';
	import { LoroDoc } from 'loro-crdt';
	import { LoroSyncPlugin, LoroUndoPlugin, undo, redo } from 'loro-prosemirror';
	import { editor, activeFile, collectionSettings } from '@/store';
	import StarterKit from '@tiptap/starter-kit';
	import Document from '@tiptap/extension-document';
	import { Typography } from '@tiptap/extension-typography';
	import { Markdown } from 'tiptap-markdown';
	import { saveNote } from '@/api/notes';
	import { TaskList } from '@tiptap/extension-task-list';
	import { TaskItem } from '@tiptap/extension-task-item';
	import { Link } from '@tiptap/extension-link';
	import CharacterCount from '@tiptap/extension-character-count';
	import SearchAndReplace from './extensions';
	import Shortcut from '../shortcut.svelte';
	import { SHORTCUTS } from '@/constants';
	import { get } from 'svelte/store';
	import { apiClient } from '@/api/client';
	import type { Entry } from '@/api/types';

	let element: HTMLDivElement;
	let tiptapEditor: Editor;
	let loroDoc: LoroDoc | null = null;
	let timeout: NodeJS.Timeout;

	onMount(() => {
		// Initialize Loro if we have a snapshot
		const initializeLoro = async () => {
			console.log('Initializing Loro...');
			if ($activeFile) {
				console.log('Active file:', $activeFile);
				try {
					const id = await apiClient.resolvePath($activeFile);
					const entry = await apiClient.request<Entry>(`/api/entries/${id}`);

					if (!entry.loroSnapshot) {
						throw new Error('Entry does not have a Loro snapshot');
					}

					loroDoc = new LoroDoc();
					// Load from snapshot
					loroDoc.import(new Uint8Array(entry.loroSnapshot));
				} catch (error) {
					console.error('Failed to initialize Loro:', error);
				}
			} else {
				console.log('No active file');
			}
		};

		initializeLoro().then(() => {
			// Create editor with or without Loro
			const extensions = [
				StarterKit.configure({
					document: false,
					hardBreak: false,
					history: loroDoc ? false : undefined, // Disable only if using Loro
					paragraph: {
						HTMLAttributes: {
							class: 'min-w-[1px] my-1 leading-5'
						}
					}
				}),
				CharacterCount,
				Document,
				SearchAndReplace.configure({
					searchResultClass: 'search-result',
					disableRegex: false
				}),
				Typography,
				TaskList,
				TaskItem.configure({
					HTMLAttributes: {
						class:
							'flex items-start pl-1.5 gap-2 [&>div]:mb-0 [&>label]:mt-0 [&>div]:w-full [&>div>p]:inline-block [&>label]:inline-flex [&>label]:items-center [&>label>input]:rounded-md'
					},
					nested: true
				}),
				Link.configure({
					HTMLAttributes: {
						class:
							'text-primary underline hover:text-primary/80 transition-all cursor-pointer text-base [&>*]:font-normal'
					}
				}),
				Markdown.configure({
					linkify: true,
					transformPastedText: true
				})
			];

			// Add Loro plugins if document exists
			if (loroDoc) {
				// Create a custom extension for Loro integration
				const LoroExtension = Extension.create({
					name: 'loro',

					addProseMirrorPlugins() {
						return [
							LoroSyncPlugin({
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								doc: loroDoc as any
							}),

							LoroUndoPlugin({ doc: loroDoc as LoroDoc })
						];
					},

					addKeyboardShortcuts() {
						return {
							'Mod-z': () => {
								undo(this.editor.view.state, this.editor.view.dispatch);
								return true;
							},
							'Mod-y': () => {
								redo(this.editor.view.state, this.editor.view.dispatch);
								return true;
							},
							'Mod-Shift-z': () => {
								redo(this.editor.view.state, this.editor.view.dispatch);
								return true;
							}
						};
					}
				});

				extensions.push(LoroExtension);
			}

			tiptapEditor = new Editor({
				element: element,
				extensions,
				editorProps: {
					attributes: {
						class: 'prose prose-theme mx-auto focus:outline-none min-h-full pb-6 select-text'
					}
				},
				onTransaction: () => {
					// force re-render so `editor.isActive` works as expected
					tiptapEditor = tiptapEditor;
					editor.set(tiptapEditor);
				},
				onUpdate: async () => {
					// If timeout before 500ms, clear it
					if (timeout) {
						clearTimeout(timeout);
					}

					// Set timeout to update the store
					timeout = setTimeout(async () => {
						if ($collectionSettings.editor.auto_save) {
							console.log('Saving note...');
							saveNote($activeFile!, loroDoc)
								.then(() => {
									editor.notifySaveEvent();
								})
								.catch((error) => {
									console.error('Error saving note:', error);
								});
						}
					}, $collectionSettings.editor.auto_save_debounce);
				}
			});
		});
	});

	onDestroy(() => {
		if (tiptapEditor) {
			tiptapEditor.destroy();
		}
		loroDoc = null;
	});
</script>

<!-- >96px is required to hide scrollbar in normal size -->
<div
	bind:this={element}
	spellcheck={$collectionSettings.editor.spell_check}
	autocorrect={$collectionSettings.editor.auto_correct.toString()}
	class="w-full h-[calc(100%-97px)] px-8"
>
	<Shortcut
		options={SHORTCUTS['note:save']}
		callback={() => saveNote(get(activeFile) ?? '', loroDoc)}
	/>
	<Shortcut
		options={SHORTCUTS['note:copy-path']}
		callback={() => navigator.clipboard.writeText(get(activeFile) ?? '')}
	/>
</div>

<style>
	div :global(ul[data-type='taskList']) {
		list-style: none;
		padding: 0;
		user-select: none;
	}

	div :global(ul[data-type='taskList'] li > label input[type='checkbox']) {
		-webkit-appearance: none;
		appearance: none;
		transition: 120ms all ease-in-out;
		/* background-color: hsl(var(--background) / 1); */
		margin: 0;
		cursor: pointer;
		width: 1.2em;
		height: 1.2em;
		position: relative;
		top: 5px;
		border: 1px solid hsl(var(--border) / 1);
		display: grid;
		place-content: center;

		&:hover {
			background-color: hsl(var(--accent) / 1);
			border: 1px solid hsl(var(--foreground) / 0.6);
		}

		/* &:checked {
			background-color: hsl(var(--primary) / 1);
		} */

		&::before {
			content: '';
			width: 0.65em;
			height: 0.65em;
			transform: scale(0);
			transition: 120ms transform ease-in-out;
			box-shadow: inset 1em 1em;
			transform-origin: center;
			clip-path: polygon(10% 44%, 0 65%, 40% 100%, 100% 10%, 80% 0%, 43% 62%);
		}

		&:checked::before {
			transform: scale(1);
		}
	}

	div :global(ul[data-type='taskList'] li[data-checked='true'] > div > p) {
		color: hsl(var(--foreground) / 0.6);
		text-decoration: line-through;
		text-decoration-thickness: 1px;
	}

	div :global(ul[data-type='taskList'] li > label) {
		margin-right: 0.2rem;
		user-select: none;
	}

	div :global(.search-result) {
		background-color: hsl(var(--muted));
	}

	div :global(.search-result-current) {
		background-color: rgba(248, 160, 30, 0.5);
	}
</style>
