import { Markdown } from 'tiptap-markdown';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import Document from '@tiptap/extension-document';
import SearchAndReplace from './searchAndReplace';
import Typography from '@tiptap/extension-typography';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';

export const extensions = [
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
