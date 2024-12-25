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
    BiData,
    BiCodeAlt
} from "react-icons/bi"
import { useTheme } from "../../theme/themeContext"
import { useEditorState } from "../state/editorState"
import "../../../styles/MenuBar.css"

export function MenuBar() {
    const { editor } = useCurrentEditor()
    const [showAlignMenu, setShowAlignMenu] = useState(false)
    const { theme, toggleTheme } = useTheme()
    const { showRawOutput, setShowRawOutput } = useEditorState()

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