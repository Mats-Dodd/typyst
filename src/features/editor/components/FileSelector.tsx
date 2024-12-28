import React from 'react'
import { convertMdToJson, convertDocxToJson } from '../services/fileSystemService'
import { initializeVersionControl, isVersionControlled } from '../../versioning/services/versionControlService'

interface FileSelectorProps {
  onFileSelect: (content: any, filePath?: string) => void;
}

export function FileSelector({ onFileSelect }: FileSelectorProps): JSX.Element {
  const handleFileSelect = async () => {
    try {
      const result = await window.fs.showOpenDialog();
      if (!result.success || !result.filePath || !result.content) {
        throw new Error(result.error || 'Failed to open file');
      }

      const filePath = result.filePath;
      const isMarkdown = filePath.endsWith('.md');
      const isDocx = filePath.endsWith('.docx');

      let jsonContent: string;
      if (isMarkdown) {
        jsonContent = await convertMdToJson(result.content);
      } else if (isDocx) {
        // Convert base64 string back to ArrayBuffer
        const binaryString = atob(result.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        jsonContent = await convertDocxToJson(bytes.buffer);
      } else {
        throw new Error('Unsupported file type');
      }

      const parsedContent = JSON.parse(jsonContent);

      // Check if the file is already under version control
      const isVersioned = await isVersionControlled(filePath);
      if (!isVersioned) {
        // Initialize version control for the file
        await initializeVersionControl(filePath, parsedContent);
        console.log('Initialized version control for:', filePath);
      }

      onFileSelect(parsedContent, filePath);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing the file. Please try again.');
    }
  };

  const handleNewDocument = async () => {
    const blankDocument = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: []
      }]
    };

    // Create a new file path for the blank document
    const filePath = await window.path.join(await window.process.cwd(), 'files', `untitled-${Date.now()}.md`);
    
    try {
      // Create the files directory if it doesn't exist
      await window.fs.createDir(await window.path.dirname(filePath));
      
      // Initialize version control for the new document
      await initializeVersionControl(filePath, blankDocument);
      console.log('Initialized version control for new document:', filePath);
      
      onFileSelect(blankDocument, filePath);
    } catch (error) {
      console.error('Error initializing version control:', error);
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