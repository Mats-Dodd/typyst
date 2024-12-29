import React, { useState } from "react"
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
    BiCodeAlt,
    BiGitBranch,
    BiGitCommit
} from "react-icons/bi"
import { useTheme } from "../../theme/themeContext"
import "../../../styles/MenuBar.css"
import { convertJsonToMd, convertJsonToDocx, renameFile } from "../services/fileSystemService"
import { BranchControls } from '../../versioning/components/BranchControls';

interface MenuBarProps {
    currentFilePath?: string;
    onFileNameChange?: (newPath: string) => void;
    onSave?: () => Promise<void>;
    showSidebar?: boolean;
    setShowSidebar?: (show: boolean | ((prev: boolean) => boolean)) => void;
    currentBranch?: string;
    branches?: string[];
    showBranchSelector?: boolean;
    setShowBranchSelector?: (show: boolean) => void;
    onBranchSwitch?: (branchName: string) => Promise<void>;
    onBranchCreate?: () => Promise<void>;
    onBranchDelete?: (branchName: string) => Promise<void>;
}

export function MenuBar({ 
    currentFilePath, 
    onFileNameChange,
    onSave,
    showSidebar,
    setShowSidebar,
    currentBranch = 'main',
    branches = ['main'],
    showBranchSelector = false,
    setShowBranchSelector,
    onBranchSwitch,
    onBranchCreate,
    onBranchDelete
}: MenuBarProps) {
    const { editor } = useCurrentEditor()
    const { theme, toggleTheme } = useTheme()
    const [isEditing, setIsEditing] = useState(false)
    const [editedName, setEditedName] = useState('')

    const getFileName = (filePath: string) => {
        const parts = filePath.split('/')
        return parts[parts.length - 1]
    }

    const getFileExtension = (filePath: string) => {
        const parts = filePath.split('.')
        return parts[parts.length - 1]
    }

    const getDirectory = (filePath: string) => {
        const parts = filePath.split('/')
        parts.pop()
        return parts.join('/')
    }

    const handleFileNameClick = () => {
        if (!currentFilePath || !onFileNameChange) return
        setIsEditing(true)
        const fileName = getFileName(currentFilePath)
        setEditedName(fileName || '')
    }

    const handleFileNameSubmit = async () => {
        if (!currentFilePath || !onFileNameChange || !editedName) return
        const directory = getDirectory(currentFilePath)
        const extension = getFileExtension(currentFilePath)
        const newPath = `${directory}/${editedName}.${extension}`
        onFileNameChange(newPath)
        setIsEditing(false)
    }

    const handleFileNameKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            await handleFileNameSubmit()
        } else if (e.key === 'Escape') {
            setIsEditing(false)
        }
    }

    const handleAlignment = (alignment: string) => {
        editor?.chain().focus().setTextAlign(alignment).run()
    }

    return (
        <div className="menu-bar">
            <div className="menu-section">
                {currentFilePath && (
                    <div className="file-name" onClick={handleFileNameClick}>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedName}
                                onChange={e => setEditedName(e.target.value)}
                                onKeyDown={handleFileNameKeyDown}
                                onBlur={handleFileNameSubmit}
                                autoFocus
                            />
                        ) : (
                            getFileName(currentFilePath)
                        )}
                    </div>
                )}
            </div>

            <div className="menu-section">
                <button onClick={() => editor?.chain().focus().toggleBold().run()}>
                    <BiBold />
                </button>
                <button onClick={() => editor?.chain().focus().toggleItalic().run()}>
                    <BiItalic />
                </button>
                <button onClick={() => editor?.chain().focus().toggleStrike().run()}>
                    <BiStrikethrough />
                </button>
                <button onClick={() => editor?.chain().focus().toggleBulletList().run()}>
                    <BiListUl />
                </button>
                <button onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
                    <BiListOl />
                </button>
                <button onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>
                    <BiCodeAlt />
                </button>
            </div>

            <div className="menu-section">
                <button onClick={() => handleAlignment('left')}>
                    <BiAlignLeft />
                </button>
                <button onClick={() => handleAlignment('center')}>
                    <BiAlignMiddle />
                </button>
                <button onClick={() => handleAlignment('right')}>
                    <BiAlignRight />
                </button>
                <button onClick={() => handleAlignment('justify')}>
                    <BiAlignJustify />
                </button>
            </div>

            <div className="menu-section">
                <button onClick={() => editor?.chain().focus().undo().run()}>
                    <BiUndo />
                </button>
                <button onClick={() => editor?.chain().focus().redo().run()}>
                    <BiRedo />
                </button>
            </div>

            {onSave && (
                <div className="menu-section">
                    <button onClick={onSave}>Save</button>
                </div>
            )}

            {setShowSidebar && (
                <div className="menu-section">
                    <button onClick={() => setShowSidebar(prev => !prev)}>
                        {showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
                    </button>
                </div>
            )}

            <div className="menu-section version-control">
                <div className="branch-selector">
                    <button onClick={() => setShowBranchSelector?.(!showBranchSelector)}>
                        <BiGitBranch />
                        <span>{currentBranch}</span>
                    </button>
                    {showBranchSelector && (
                        <div className="branch-dropdown">
                            {branches.map(branch => (
                                <div
                                    key={branch}
                                    className={`branch-item ${branch === currentBranch ? 'active' : ''}`}
                                    onClick={() => onBranchSwitch?.(branch)}
                                >
                                    <span>{branch}</span>
                                    {branch !== 'main' && (
                                        <button
                                            className="delete-branch"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onBranchDelete?.(branch);
                                            }}
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button className="create-branch" onClick={() => onBranchCreate?.()}>
                                <BiGitBranch /> New Branch
                            </button>
                        </div>
                    )}
                </div>
                <button onClick={() => onSave?.()}>
                    <BiGitCommit /> Commit
                </button>
            </div>

            <div className="menu-section">
                <button onClick={toggleTheme}>
                    {theme === 'light' ? <BiMoon /> : <BiSun />}
                </button>
            </div>
        </div>
    )
} 