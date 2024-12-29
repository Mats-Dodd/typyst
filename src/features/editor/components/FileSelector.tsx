import React from 'react'
import { convertMdToJson, convertDocxToJson } from '../services/fileSystemService'
import { versionControlService } from '../../versioning/services/versionControlService'

interface FileSelectorProps {
  onFileSelect: (content: any, filePath?: string) => void;
}

export function FileSelector({ onFileSelect }: FileSelectorProps): JSX.Element {
  const handleFileSelect = async () => {
    console.log('Starting file selection process...');
    try {
      console.log('Showing open dialog...');
      const result = await window.fs.showOpenDialog();
      console.log('Open dialog result:', result);

      if (!result.success || !result.filePath || !result.content) {
        console.error('Dialog failed or missing data:', { result });
        throw new Error(result.error || 'Failed to open file');
      }

      const filePath = result.filePath;
      const isMarkdown = filePath.endsWith('.md');
      const isDocx = filePath.endsWith('.docx');
      console.log('Selected file:', { filePath, isMarkdown, isDocx });

      let jsonContent: string;
      if (isMarkdown) {
        console.log('Converting markdown to JSON...');
        jsonContent = await convertMdToJson(result.content);
      } else if (isDocx) {
        console.log('Converting DOCX to JSON...');
        // Convert base64 string back to ArrayBuffer
        const binaryString = atob(result.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        jsonContent = await convertDocxToJson(bytes.buffer);
      } else {
        console.error('Unsupported file type');
        throw new Error('Unsupported file type');
      }
      console.log('Converted content to JSON');

      const parsedContent = JSON.parse(jsonContent);
      console.log('Parsed JSON content');

      // Check if the file is already under version control
      console.log('Checking version control status...');
      let doc = await versionControlService.getDocumentByPath(filePath);
      if (!doc) {
        console.log('Initializing version control for new document...');
        // Initialize version control for the file
        doc = await versionControlService.createDocument(filePath);
        await versionControlService.saveContent(doc.id, parsedContent);
        console.log('Initialized version control for:', filePath);
      } else {
        console.log('Document already under version control, loading latest content...');
        // Load the latest content from version control
        const content = await versionControlService.loadContent(doc.id);
        if (content) {
          console.log('Loaded content from version control');
          onFileSelect(content, filePath);
          return;
        }
        console.log('No existing content found in version control');
      }

      console.log('Calling onFileSelect with parsed content');
      onFileSelect(parsedContent, filePath);
    } catch (error) {
      console.error('Error in file selection process:', error);
      alert('Error processing the file. Please try again.');
    }
  };

  const handleNewDocument = async () => {
    console.log('Creating new document...');
    const blankDocument = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: []
      }]
    };

    try {
      console.log('Getting file path for new document...');
      // Create a new file path for the blank document
      const filePath = await window.path.join(await window.process.cwd(), 'files', `untitled-${Date.now()}.md`);
      console.log('New document path:', filePath);
      
      // Create the files directory if it doesn't exist
      console.log('Creating directory...');
      await window.fs.createDir(await window.path.dirname(filePath));
      
      // Initialize version control for the new document
      console.log('Initializing version control...');
      const doc = await versionControlService.createDocument(filePath);
      await versionControlService.saveContent(doc.id, blankDocument);
      console.log('Initialized version control for new document:', filePath);
      
      console.log('Calling onFileSelect with blank document');
      onFileSelect(blankDocument, filePath);
    } catch (error) {
      console.error('Error creating new document:', error);
      alert('Error creating new document. Please try again.');
    }
  };

  return (
    <div className="file-selector">
      <div className="file-input-wrapper">
        <div className="button-stack">
          <button onClick={handleFileSelect} className="file-input-button">
            Existing File
          </button>
          <button onClick={handleNewDocument} className="file-input-button">
            Blank Slate
          </button>
        </div>
      </div>
    </div>
  );
} 