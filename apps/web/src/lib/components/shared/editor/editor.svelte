<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
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
	import {
		LoroSyncPlugin,
		LoroCursorPlugin,
		LoroUndoPlugin,
		type CursorAwareness
	} from 'loro-prosemirror';
	import { loroDocuments } from '@/stores/loro-document';
	import type { LoroDoc } from 'loro-crdt';
	import { getUser } from '@/stores/session';

	let element: HTMLDivElement;
	let tiptapEditor: Editor;
	let timeout: NodeJS.Timeout;
	let loroDoc: LoroDoc | null = null;
	let awareness: CursorAwareness | null = null;
	let unsubscribe: (() => void) | null = null;
	let isCollaborationEnabled = false;
	let registeredLoroPlugins: any[] = [];
	let isInitializing = false;

	// Initialize Loro document for collaboration
	async function initializeLoroDocument(entryId: string) {
		// Prevent concurrent initializations
		if (isInitializing) {
			return;
		}
		isInitializing = true;

		try {
			// First, unregister any existing Loro plugins
			if (tiptapEditor && registeredLoroPlugins.length > 0) {
				registeredLoroPlugins.forEach((plugin) => {
					tiptapEditor.unregisterPlugin(plugin);
				});
				registeredLoroPlugins = [];
			}

			// Get or create Loro document for this entry
			let docState = loroDocuments.getDocument(entryId);

			if (!docState) {
				// Create new document with initial content from editor
				const content = tiptapEditor?.getHTML() || '';
				const result = loroDocuments.createDocument(entryId, content);
				docState = {
					doc: result.doc,
					awareness: result.awareness,
					entryId,
					isDirty: false
				};
			}

			loroDoc = docState.doc;
			awareness = docState.awareness;

			// Set user info for awareness
			const user = getUser();
			if (user && awareness) {
				awareness.setLocalState({
					user: {
						name: user.name || user.email || 'Anonymous',
						color: generateUserColor(user.id)
					},
					anchor: null,
					focus: null
				});
			}

			// Add Loro plugins to editor
			if (tiptapEditor && loroDoc) {
				const loroPlugins = [
					LoroSyncPlugin({ doc: loroDoc as any }),
					LoroCursorPlugin(awareness!, {
						createCursor: defaultCursorBuilder,
						createSelection: defaultSelectionBuilder
					}),
					LoroUndoPlugin({ doc: loroDoc as any })
				];

				// Register plugins and keep track of them
				loroPlugins.forEach((plugin) => {
					tiptapEditor.registerPlugin(plugin);
					registeredLoroPlugins.push(plugin);
				});

				isCollaborationEnabled = true;
			}
		} finally {
			isInitializing = false;
		}
	}

	// Generate consistent color for user
	function generateUserColor(userId: string): string {
		const colors = [
			'#FF6B6B',
			'#4ECDC4',
			'#45B7D1',
			'#96CEB4',
			'#FFEAA7',
			'#DDA0DD',
			'#98D8C8',
			'#F8B500'
		];
		const hash = userId.split('').reduce((acc, char) => {
			return char.charCodeAt(0) + ((acc << 5) - acc);
		}, 0);
		return colors[Math.abs(hash) % colors.length];
	}

	// Default cursor builder for remote cursors
	function defaultCursorBuilder(user: any) {
		const cursor = document.createElement('span');
		cursor.classList.add('remote-cursor');
		cursor.style.borderLeftColor = user.color;
		cursor.setAttribute('data-user', user.name);
		return cursor;
	}

	// Default selection builder for remote selections
	function defaultSelectionBuilder(user: any) {
		return {
			class: 'remote-selection',
			style: `background-color: ${user.color}20;`
		};
	}

	onMount(() => {
		// Create base editor configuration
		const extensions = [
			StarterKit.configure({
				document: false,
				hardBreak: false,
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
				// Mark Loro document as dirty when content changes
				if (loroDoc && $activeFile) {
					loroDocuments.markDirty($activeFile);
				}

				// If timeout before 500ms, clear it
				if (timeout) {
					clearTimeout(timeout);
				}

				// Set timeout to update the store
				timeout = setTimeout(async () => {
					if ($collectionSettings.editor.auto_save) {
						console.log('Saving note...');
						saveNote($activeFile!)
							.then(() => {
								editor.notifySaveEvent();
								// Mark Loro document as clean after successful save
								if ($activeFile) {
									loroDocuments.markClean($activeFile, loroDoc?.version().toString());
								}
							})
							.catch((error) => {
								console.error('Error saving note:', error);
							});
					}
				}, $collectionSettings.editor.auto_save_debounce);
			}
		});

		// Watch for active file changes
		unsubscribe = activeFile.subscribe((entryId) => {
			if (entryId && tiptapEditor) {
				// Initialize Loro for the new active file
				initializeLoroDocument(entryId);
			}
		});
	});

	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}

		// Unregister Loro plugins before destroying editor
		if (tiptapEditor && registeredLoroPlugins.length > 0) {
			registeredLoroPlugins.forEach((plugin) => {
				tiptapEditor.unregisterPlugin(plugin);
			});
			registeredLoroPlugins = [];
		}

		if (tiptapEditor) {
			tiptapEditor.destroy();
		}

		// Clean up Loro resources
		if ($activeFile) {
			loroDocuments.removeDocument($activeFile);
		}
	});
</script>

<!-- >96px is required to hide scrollbar in normal size -->
<div
	bind:this={element}
	spellcheck={$collectionSettings.editor.spell_check}
	autocorrect={$collectionSettings.editor.auto_correct.toString()}
	class="w-full h-[calc(100%-97px)] px-8"
>
	<Shortcut options={SHORTCUTS['note:save']} callback={() => saveNote(get(activeFile) ?? '')} />
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

	/* Remote cursor styles */
	div :global(.remote-cursor) {
		position: absolute;
		border-left: 2px solid;
		height: 1.2em;
		pointer-events: none;
		margin-left: -1px;
		margin-top: -1px;
	}

	div :global(.remote-cursor::before) {
		content: attr(data-user);
		position: absolute;
		top: -1.4em;
		left: -1px;
		font-size: 12px;
		padding: 2px 6px;
		background-color: inherit;
		border-color: inherit;
		border: 1px solid;
		border-radius: 3px 3px 3px 0;
		white-space: nowrap;
		opacity: 0;
		transition: opacity 0.3s;
	}

	div :global(.remote-cursor:hover::before) {
		opacity: 1;
	}

	/* Remote selection styles */
	div :global(.remote-selection) {
		position: relative;
		pointer-events: none;
		opacity: 0.7;
	}
</style>
