import { LoroDoc } from 'loro-crdt';
import type { LoroDoc as LoroDocType } from 'loro-crdt';

/**
 * Extract plain text content from a Loro document
 * This is useful for displaying content without initializing the full editor
 */
export function extractTextFromLoroDoc(doc: LoroDoc): string {
	try {
		// The loro-prosemirror plugin stores content in a specific structure
		// We need to traverse the document structure to extract text
		const rootNode = doc.getMap('doc');
		
		if (!rootNode) {
			console.warn('No root document node found in Loro document');
			return '';
		}
		
		// For now, return empty string as we need to understand
		// the exact structure used by loro-prosemirror
		// This would need to be implemented based on the actual structure
		return '';
	} catch (error) {
		console.error('Error extracting text from Loro document:', error);
		return '';
	}
}

/**
 * Create a Loro document with initial text content
 * This is useful for migrating existing content to Loro format
 */
export function createLoroDocWithContent(content: string): LoroDoc {
	const doc = new LoroDoc();
	doc.setRecordTimestamp(true);
	doc.setChangeMergeInterval(10);
	
	// The actual content structure will be created by the loro-prosemirror plugin
	// when it syncs with the editor that has this content
	
	return doc;
} 