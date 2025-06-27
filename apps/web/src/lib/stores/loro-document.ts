import { writable, get } from 'svelte/store';
import { LoroDoc } from 'loro-crdt';
import { CursorAwareness } from 'loro-prosemirror';

interface LoroDocumentState {
	doc: LoroDoc;
	awareness: CursorAwareness;
	entryId: string;
	lastSyncedVersion?: string;
	isDirty: boolean;
}

function createLoroDocumentStore() {
	const documents = writable<Map<string, LoroDocumentState>>(new Map());

	return {
		subscribe: documents.subscribe,

		createDocument: (entryId: string, initialContent?: string) => {
			const doc = new LoroDoc();
			doc.setRecordTimestamp(true);
			doc.setChangeMergeInterval(10);

			// The loro-prosemirror plugin will handle the document structure
			// We don't need to pre-create containers as the plugin will do this
			// when it syncs with the editor state

			const awareness = new CursorAwareness(doc.peerIdStr);

			documents.update((docs) => {
				docs.set(entryId, {
					doc,
					awareness,
					entryId,
					isDirty: false
				});
				return docs;
			});

			return { doc, awareness };
		},

		getDocument: (entryId: string) => {
			const currentDocs = get(documents);
			return currentDocs.get(entryId);
		},

		markDirty: (entryId: string) => {
			documents.update((docs) => {
				const state = docs.get(entryId);
				if (state) {
					state.isDirty = true;
				}
				return docs;
			});
		},

		markClean: (entryId: string, version?: string) => {
			documents.update((docs) => {
				const state = docs.get(entryId);
				if (state) {
					state.isDirty = false;
					state.lastSyncedVersion = version;
				}
				return docs;
			});
		},

		removeDocument: (entryId: string) => {
			documents.update((docs) => {
				docs.delete(entryId);
				return docs;
			});
		}
	};
}

export const loroDocuments = createLoroDocumentStore();
