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
    BiGitCommit,
    BiTable
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
    const [showAlignMenu, setShowAlignMenu] = useState(false)
    const [showTableSelector, setShowTableSelector] = useState(false)
    const [hoveredCell, setHoveredCell] = useState({ row: 0, col: 0 })

    if (!editor) return null

    const getFileName = (filePath: string) => {
        const parts = filePath.split(/[/\\]/)
        return parts[parts.length - 1]?.replace(/\.[^/.]+$/, '') || 'Untitled'
    }

    const handleFileNameClick = () => {
        if (!currentFilePath || !onFileNameChange) return
        setIsEditing(true)
        setEditedName(getFileName(currentFilePath))
    }

    const handleFileNameSubmit = async () => {
        if (!currentFilePath || !onFileNameChange || !editedName) return
        const newPath = currentFilePath.replace(/[^/\\]+$/, `${editedName}${currentFilePath.match(/\.[^/.]+$/)?.[0] || ''}`)
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
        editor.chain().focus().setTextAlign(alignment).run()
        setShowAlignMenu(false)
    }

    return (
        <div className="menu-bar">
            <div className="menu-section">
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
                    className={`menu-button ${editor.isActive('bold') ? 'is-active' : ''}`}
                    data-tooltip="Bold (⌘B)"
                >
                    <BiBold />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`menu-button ${editor.isActive('italic') ? 'is-active' : ''}`}
                    data-tooltip="Italic (⌘I)"
                >
                    <BiItalic />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`menu-button ${editor.isActive('strike') ? 'is-active' : ''}`}
                    data-tooltip="Strikethrough (⌘⇧X)"
                >
                    <BiStrikethrough />
                </button>
                <div className="separator" />
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`menu-button ${editor.isActive('bulletList') ? 'is-active' : ''}`}
                    data-tooltip="Bullet List (⌘⇧8)"
                >
                    <BiListUl />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`menu-button ${editor.isActive('orderedList') ? 'is-active' : ''}`}
                    data-tooltip="Ordered List (⌘⇧7)"
                >
                    <BiListOl />
                </button>
                <div className="separator" />
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
                            <button
                                onClick={() => handleAlignment('left')}
                                className={`menu-button ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`}
                                data-tooltip="Align Left (⌘⇧L)"
                            >
                                <BiAlignLeft />
                            </button>
                            <button
                                onClick={() => handleAlignment('center')}
                                className={`menu-button ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
                                data-tooltip="Align Center (⌘⇧E)"
                            >
                                <BiAlignMiddle />
                            </button>
                            <button
                                onClick={() => handleAlignment('right')}
                                className={`menu-button ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
                                data-tooltip="Align Right (⌘⇧R)"
                            >
                                <BiAlignRight />
                            </button>
                            <button
                                onClick={() => handleAlignment('justify')}
                                className={`menu-button ${editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}`}
                                data-tooltip="Justify (⌘⇧J)"
                            >
                                <BiAlignJustify />
                            </button>
                        </div>
                    )}
                </div>
                <div className="separator" />
                <button
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    className={`menu-button ${editor.isActive('codeBlock') ? 'is-active' : ''}`}
                    data-tooltip="Code Block"
                >
                    <BiCodeAlt />
                </button>
                <div className="menu-dropdown">
                    <button
                        onClick={() => setShowTableSelector(!showTableSelector)}
                        className={`menu-button ${editor.isActive('table') ? 'is-active' : ''}`}
                        data-tooltip="Insert Table"
                    >
                        <BiTable />
                    </button>
                    {showTableSelector && (
                        <div className="table-grid-selector">
                            <div className="table-grid-title">Insert Table</div>
                            <div 
                                className="table-grid"
                                onMouseLeave={() => setHoveredCell({ row: 0, col: 0 })}
                            >
                                {Array.from({ length: 100 }, (_, i) => {
                                    const row = Math.floor(i / 10) + 1;
                                    const col = (i % 10) + 1;
                                    return (
                                        <div
                                            key={i}
                                            className={`table-grid-cell ${
                                                row <= hoveredCell.row && col <= hoveredCell.col ? 'active' : ''
                                            }`}
                                            onMouseEnter={() => setHoveredCell({ row, col })}
                                            onClick={() => {
                                                editor.chain().focus().insertTable({
                                                    rows: row,
                                                    cols: col,
                                                    withHeaderRow: true
                                                }).run();
                                                setShowTableSelector(false);
                                                setHoveredCell({ row: 0, col: 0 });
                                            }}
                                        />
                                    );
                                })}
                            </div>
                            <div className="table-dimensions">
                                {hoveredCell.row > 0
                                    ? `${hoveredCell.row} × ${hoveredCell.col}`
                                    : 'Hover to select'}
                            </div>
                        </div>
                    )}
                </div>
                <div className="separator" />
                <BranchControls editor={editor} currentFilePath={currentFilePath} />
            </div>

            <div className="file-name-container">
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

            <button 
                onClick={toggleTheme}
                className="menu-button theme-toggle"
                data-tooltip={`${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
                {theme === 'light' ? <BiMoon /> : <BiSun />}
            </button>
        </div>
    )
} 