import React, { useState, useEffect, useCallback } from "react"
import { useCurrentEditor } from "@tiptap/react"
import { 
    BiBold, 
    BiItalic, 
    BiStrikethrough, 
    BiListUl, 
    BiListOl,
    BiAlignLeft,
    BiAlignMiddle,
    BiAlignRight,
    BiAlignJustify,
    BiAlignLeft as BiAlign,
    BiUndo,
    BiRedo,
    BiSun,
    BiMoon,
    BiData,
    BiCodeAlt,
    BiSave,
    BiGitBranch,
    BiChevronDown,
    BiCrown,
    BiDotsHorizontalRounded,
    BiRename,
    BiTrash
} from "react-icons/bi"
import { useTheme } from "../../theme/themeContext"
import "../../../styles/MenuBar.css"
import { convertJsonToMd, convertJsonToDocx, renameFile } from "../services/fileSystemService"
import { BranchSelector } from "./BranchSelector"
import { FaPlus } from "react-icons/fa"

interface MenuBarProps {
    showRawOutput: boolean
    setShowRawOutput: (show: boolean) => void
    currentFilePath?: string
    onSave?: () => void
    onFileNameChange?: (newPath: string) => void
}

interface BranchContextMenu {
    branch: string;
    x: number;
    y: number;
}

const BranchContextMenu: React.FC<{
    contextMenu: BranchContextMenu;
    currentBranch: string;
    onDelete: (branch: string) => void;
    onRename: (branch: string) => void;
    onClose: () => void;
}> = ({ contextMenu, currentBranch, onDelete, onRename, onClose }) => {
    useEffect(() => {
        const handleClickOutside = () => onClose();
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [onClose]);

    const isDeleteDisabled = contextMenu.branch === 'main';

    return (
        <div
            className="branch-context-menu"
            style={{
                position: 'fixed',
                left: contextMenu.x,
                top: contextMenu.y
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <button
                className="branch-menu-option"
                onClick={() => onRename(contextMenu.branch)}
                disabled={contextMenu.branch === 'main'}
            >
                <BiRename />
                Rename Branch
            </button>
            <button
                className="branch-menu-option"
                onClick={() => onDelete(contextMenu.branch)}
                disabled={isDeleteDisabled}
                title={isDeleteDisabled ? "Cannot delete main branch" : ""}
            >
                <BiTrash />
                Delete Branch
            </button>
        </div>
    );
};

export function MenuBar({ showRawOutput, setShowRawOutput, currentFilePath, onSave, onFileNameChange }: MenuBarProps) {
    const { editor } = useCurrentEditor()
    const [showAlignMenu, setShowAlignMenu] = useState(false)
    const [isEditingFileName, setIsEditingFileName] = useState(false)
    const [editedFileName, setEditedFileName] = useState("")
    const { theme, toggleTheme } = useTheme()
    const [showBranchSelector, setShowBranchSelector] = useState(false)
    const [currentBranch, setCurrentBranch] = useState<string>('');
    const [branches, setBranches] = useState<string[]>([]);
    const [activeBranchMenu, setActiveBranchMenu] = useState<string | null>(null);
    const [isRenamingBranch, setIsRenamingBranch] = useState<string | null>(null);
    const [newBranchName, setNewBranchName] = useState('');
    const [contextMenu, setContextMenu] = useState<BranchContextMenu | null>(null);

    useEffect(() => {
        if (currentFilePath) {
            loadCurrentBranch();
            loadBranches();
        }
    }, [currentFilePath]);

    const sanitizeBranchName = (name: string): string => {
        return name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-_]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const loadBranches = async () => {
        try {
            const branchList = await window.versionControl.getBranches();
            if (Array.isArray(branchList)) {
                setBranches(branchList.filter((branch): branch is string => typeof branch === 'string'));
            }
        } catch (error) {
            console.error('Failed to load branches:', error);
        }
    };

    const loadCurrentBranch = async () => {
        try {
            const branch = await window.versionControl.getCurrentBranch();
            setCurrentBranch(branch || 'main');
        } catch (error) {
            console.error('Failed to load current branch:', error);
            setCurrentBranch('main');
        }
    };

    const getFileName = (filePath: string) => {
        const parts = filePath.split(/[/\\]/)
        const fullName = parts[parts.length - 1] || ''
        // Remove the extension
        return fullName.replace(/\.[^/.]+$/, '')
    }

    const getFileExtension = (filePath: string) => {
        const match = filePath.match(/\.[^/.]+$/)
        return match ? match[0] : ''
    }

    const getDirectory = (filePath: string) => {
        const lastSlashIndex = filePath.lastIndexOf('/')
        if (lastSlashIndex === -1) {
            const lastBackslashIndex = filePath.lastIndexOf('\\')
            return lastBackslashIndex === -1 ? '' : filePath.slice(0, lastBackslashIndex)
        }
        return filePath.slice(0, lastSlashIndex)
    }

    const displayFileName = currentFilePath ? getFileName(currentFilePath) : "Untitled"

    const handleFileNameClick = () => {
        if (currentFilePath) {
            const fileName = getFileName(currentFilePath)
            if (fileName) {
                setEditedFileName(fileName)
                setIsEditingFileName(true)
            }
        }
    }

    const handleFileNameSubmit = async () => {
        if (currentFilePath && editedFileName && onFileNameChange && editor) {
            const directory = getDirectory(currentFilePath)
            const extension = getFileExtension(currentFilePath)
            const newPath = directory 
                ? `${directory}/${editedFileName}${extension}`
                : `${editedFileName}${extension}`
            
            try {
                const success = await renameFile(currentFilePath, newPath, editor.getJSON())
                if (success) {
                    onFileNameChange(newPath)
                } else {
                    alert('Failed to rename file. Please try again.')
                }
            } catch (error) {
                console.error('Error renaming file:', error)
                alert('Error renaming file. Please try again.')
            }
        }
        setIsEditingFileName(false)
    }

    const handleFileNameKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault() // Prevent default to avoid potential form submission
            await handleFileNameSubmit()
        } else if (e.key === 'Escape') {
            setIsEditingFileName(false)
        }
    }

    const handleSave = async () => {
        if (!editor || !currentFilePath) {
            return;
        }
        
        try {
            const isDocx = currentFilePath.endsWith('.docx');
            
            if (isDocx) {
                const docxBlob = await convertJsonToDocx(editor.getJSON());
                const buffer = await docxBlob.arrayBuffer();
                const result = await window.fs.writeBuffer(currentFilePath, buffer);
                
                if (!result.success) {
                    console.error('Failed to save DOCX file:', result.error);
                    alert('Failed to save file. Please try again.');
                }
            } else {
                const markdown = await convertJsonToMd(editor.getJSON());
                const result = await window.fs.writeFile(currentFilePath, markdown);
                
                if (!result.success) {
                    console.error('Failed to save file:', result.error);
                    alert('Failed to save file. Please try again.');
                }
            }
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Error saving file. Please try again.');
        }
    }

    const handleBranchSwitch = async (branchName: string) => {
        if (!editor || !currentFilePath) return;

        try {
            await handleSave();
            await window.versionControl.switchBranch(branchName);
            const content = await window.versionControl.loadDocument(branchName);
            editor.commands.setContent(content);
            setShowBranchSelector(false);
            setCurrentBranch(branchName);
        } catch (error) {
            console.error('Failed to switch branch:', error);
            alert('Failed to switch branch. Please try again.');
        }
    };

    const handleBranchCreate = async (branchName: string) => {
        if (!editor || !currentFilePath) return;

        try {
            // Save current changes before creating new branch
            await handleSave();
            
            // Create and switch to new branch
            await window.versionControl.createBranch(branchName);
            
            setShowBranchSelector(false);
            await loadCurrentBranch(); // Refresh current branch name
        } catch (error) {
            console.error('Failed to create branch:', error);
            alert('Failed to create branch. Please try again.');
        }
    };

    const getNextBranchNumber = (): number => {
        const branchNumbers = branches
            .map(branch => {
                const match = branch.match(/^branch-(\d+)$/);
                return match ? parseInt(match[1], 10) : 0;
            })
            .filter(num => num > 0);

        if (branchNumbers.length === 0) return 1;
        return Math.max(...branchNumbers) + 1;
    };

    const handleCreateBranch = async () => {
        try {
            const nextNumber = getNextBranchNumber();
            const branchName = `branch-${nextNumber}`;

            await handleSave();
            await window.versionControl.createBranch(branchName);
            
            setShowBranchSelector(false);
            await loadCurrentBranch();
            await loadBranches();
        } catch (error) {
            console.error('Failed to create branch:', error);
            alert('Failed to create branch. Please try again.');
        }
    };

    const handleRenameBranch = async (oldName: string, newName: string) => {
        if (!editor || !currentFilePath || oldName === 'main') return;
        
        try {
            // Save current changes
            await handleSave();
            
            // Create new branch with new name
            await window.versionControl.createBranch(newName);
            
            // Switch to new branch
            await window.versionControl.switchBranch(newName);
            
            // Load the content from the old branch
            const content = await window.versionControl.loadDocument(oldName);
            
            // Set the content in the editor
            editor.commands.setContent(content);
            
            // Save the content to the new branch
            await window.versionControl.saveDocument(editor.getJSON());
            
            setIsRenamingBranch(null);
            setNewBranchName('');
            await loadBranches();
            await loadCurrentBranch();
        } catch (error) {
            console.error('Failed to rename branch:', error);
            alert('Failed to rename branch. Please try again.');
        }
    };

    const handleDeleteBranch = async (branchName: string) => {
        if (!editor || !currentFilePath || branchName === 'main') return;
        
        try {
            await window.versionControl.deleteBranch(branchName);
            await loadBranches();
        } catch (error) {
            console.error('Failed to delete branch:', error);
            alert('Failed to delete branch. Please try again.');
        }
    };

    const handleBranchDelete = async (branchName: string) => {
        if (!editor || !currentFilePath || branchName === 'main') return;
        
        try {
            // If we're deleting the current branch, switch to main first
            if (branchName === currentBranch) {
                await handleBranchSwitch('main');
            }
            
            await window.versionControl.deleteBranch(branchName);
            await loadBranches();
            setContextMenu(null);
        } catch (error) {
            console.error('Failed to delete branch:', error);
            alert('Failed to delete branch. Please try again.');
        }
    };

    const handleContextMenu = (e: React.MouseEvent, branch: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ branch, x: e.clientX, y: e.clientY });
    };

    const handleContextMenuClose = useCallback(() => {
        setContextMenu(null);
    }, []);

    const handleBranchRename = useCallback((branch: string) => {
        setIsRenamingBranch(branch);
        setNewBranchName(branch);
        setContextMenu(null);
    }, []);

    if (!editor)
        return null

    const alignmentOptions = [
        { icon: BiAlignLeft, value: 'left', tooltip: 'Align Left (⌘⇧L)' },
        { icon: BiAlignMiddle, value: 'center', tooltip: 'Align Center (⌘⇧E)' },
        { icon: BiAlignRight, value: 'right', tooltip: 'Align Right (⌘⇧R)' },
        { icon: BiAlignJustify, value: 'justify', tooltip: 'Justify (⌘⇧J)' },
    ]

    const handleAlignment = (alignment: string) => {
        editor.chain().focus().setTextAlign(alignment).run()
        setShowAlignMenu(false)
    }

    return (
        <div className="control-group">
            <div className="button-group">
                <button
                    onClick={handleSave}
                    className="menu-button"
                    disabled={!currentFilePath}
                    data-tooltip="Save (⌘S)"
                >
                    <BiSave />
                </button>
                <div className="separator" />
                <button
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="menu-button"
                    data-tooltip="Undo (⌘Z)"
                >
                    <BiUndo />
                </button>
                <button
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="menu-button"
                    data-tooltip="Redo (⌘⇧Z)"
                >
                    <BiRedo />
                </button>
                <div className="separator" />
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`menu-button ${editor.isActive("bold") ? "is-active" : ""}`}
                    data-tooltip="Bold (⌘B)"
                >
                    <BiBold />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`menu-button ${editor.isActive("italic") ? "is-active" : ""}`}
                    data-tooltip="Italic (⌘I)"
                >
                    <BiItalic />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`menu-button ${editor.isActive("strike") ? "is-active" : ""}`}
                    data-tooltip="Strikethrough (⌘⇧X)"
                >
                    <BiStrikethrough />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`menu-button ${editor.isActive("bulletList") ? "is-active" : ""}`}
                    data-tooltip="Bullet List (⌘⇧8)"
                >
                    <BiListUl />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`menu-button ${editor.isActive("orderedList") ? "is-active" : ""}`}
                    data-tooltip="Ordered List (⌘⇧7)"
                >
                    <BiListOl />
                </button>
                <div className="menu-dropdown">
                    <button
                        onClick={() => setShowAlignMenu(!showAlignMenu)}
                        className="menu-button"
                        data-tooltip="Text Alignment"
                    >
                        <BiAlign />
                    </button>
                    {showAlignMenu && (
                        <div className="dropdown-menu">
                            {alignmentOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleAlignment(option.value)}
                                    className={`menu-button ${editor.isActive({ textAlign: option.value }) ? "is-active" : ""}`}
                                    data-tooltip={option.tooltip}
                                >
                                    <option.icon />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="separator" />
                <button
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    className={`menu-button ${editor.isActive('codeBlock') ? "is-active" : ""}`}
                    data-tooltip="Code Block"
                >
                    <BiCodeAlt />
                </button>
                <div className="separator" />
                <button
                    onClick={() => setShowRawOutput(!showRawOutput)}
                    className={`menu-button ${showRawOutput ? "is-active" : ""}`}
                    data-tooltip="Toggle Raw Output"
                >
                    <BiData />
                </button>
                <div className="separator" />
                <div className="branch-control">
                    {currentFilePath && currentBranch && (
                        <div className="branch-control">
                            <div 
                                className={`branch-display ${showBranchSelector ? 'active' : ''}`}
                                onClick={() => setShowBranchSelector(!showBranchSelector)}
                                title="Click to switch branches"
                            >
                                <span className="branch-name">{currentBranch}</span>
                                <BiChevronDown className="branch-caret" />
                            </div>
                            {currentBranch !== 'main' && (
                                <button
                                    className="branch-menu-trigger"
                                    onClick={(e) => handleContextMenu(e, currentBranch)}
                                >
                                    <BiDotsHorizontalRounded />
                                </button>
                            )}
                            {showBranchSelector && (
                                <div className="branch-dropdown">
                                    {branches.includes('main') && (
                                        <div
                                            key="main"
                                            className={`branch-item main-branch ${currentBranch === 'main' ? 'active' : ''}`}
                                            onClick={() => handleBranchSwitch('main')}
                                        >
                                            <BiCrown className="crown-icon" />
                                            <span>main</span>
                                        </div>
                                    )}
                                    <div className="branch-dropdown-header">
                                        <BiGitBranch />
                                        <span>Branches</span>
                                    </div>
                                    <div className="branch-list">
                                        {branches
                                            .filter((branch): branch is string => 
                                                typeof branch === 'string' && branch !== 'main'
                                            )
                                            .map((branch) => (
                                                <div
                                                    key={branch}
                                                    className={`branch-item ${branch === currentBranch ? 'active' : ''}`}
                                                    onClick={() => handleBranchSwitch(branch)}
                                                >
                                                    <span>{branch}</span>
                                                </div>
                                            ))}
                                    </div>
                                    <div 
                                        className="create-branch-option"
                                        onClick={handleCreateBranch}
                                    >
                                        <FaPlus />
                                        Create new branch
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="file-name-container">
                {isEditingFileName ? (
                    <input
                        type="text"
                        className="file-name-input"
                        value={editedFileName}
                        onChange={(e) => setEditedFileName(e.target.value)}
                        onBlur={handleFileNameSubmit}
                        onKeyDown={handleFileNameKeyDown}
                        autoFocus
                    />
                ) : (
                    <div 
                        className="file-name-display"
                        onClick={handleFileNameClick}
                        title="Click to rename"
                    >
                        {displayFileName}
                    </div>
                )}
            </div>
            <button
                onClick={toggleTheme}
                className="menu-button theme-toggle"
                data-tooltip={`${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
                {theme === 'light' ? <BiMoon /> : <BiSun />}
            </button>
            {contextMenu && (
                <BranchContextMenu
                    contextMenu={contextMenu}
                    currentBranch={currentBranch}
                    onDelete={handleBranchDelete}
                    onRename={handleBranchRename}
                    onClose={handleContextMenuClose}
                />
            )}
            {isRenamingBranch && (
                <div className="branch-rename-dialog">
                    <div className="branch-rename-form">
                        <input
                            type="text"
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            placeholder="New branch name"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleRenameBranch(isRenamingBranch, sanitizeBranchName(newBranchName));
                                } else if (e.key === 'Escape') {
                                    setIsRenamingBranch(null);
                                    setNewBranchName('');
                                }
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
} 