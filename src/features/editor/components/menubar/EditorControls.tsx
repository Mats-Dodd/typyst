import React from 'react';
import {
    BiBold,
    BiItalic,
    BiStrikethrough,
    BiListUl,
    BiListOl,
    BiAlignLeft,
    BiUndo,
    BiRedo,
    BiCodeAlt,
    BiData,
} from 'react-icons/bi';
import { useEditorControls } from '../../hooks/useEditorControls';
import { TOOLTIPS } from '../../constants/menubar';
import type { EditorControlsProps } from '../../types/menubar';
import styles from '../../../../styles/menubar/MenuBar.module.css';

export const EditorControls: React.FC<EditorControlsProps> = ({
    editor,
    showRawOutput,
    setShowRawOutput,
}) => {
    const {
        showAlignMenu,
        setShowAlignMenu,
        handleAlignment,
        toggleBold,
        toggleItalic,
        toggleStrike,
        toggleBulletList,
        toggleOrderedList,
        toggleCodeBlock,
        undo,
        redo,
        alignmentOptions,
        canUndo,
        canRedo,
        isActive,
    } = useEditorControls(editor);

    return (
        <div className={styles['button-group']}>
            <button
                onClick={undo}
                disabled={!canUndo}
                className={styles['menu-button']}
                data-tooltip={TOOLTIPS.UNDO}
            >
                <BiUndo />
            </button>
            <button
                onClick={redo}
                disabled={!canRedo}
                className={styles['menu-button']}
                data-tooltip={TOOLTIPS.REDO}
            >
                <BiRedo />
            </button>
            <div className={styles.separator} />
            <button
                onClick={toggleBold}
                className={`${styles['menu-button']} ${isActive.bold ? styles['is-active'] : ''}`}
                data-tooltip={TOOLTIPS.BOLD}
            >
                <BiBold />
            </button>
            <button
                onClick={toggleItalic}
                className={`${styles['menu-button']} ${isActive.italic ? styles['is-active'] : ''}`}
                data-tooltip={TOOLTIPS.ITALIC}
            >
                <BiItalic />
            </button>
            <button
                onClick={toggleStrike}
                className={`${styles['menu-button']} ${isActive.strike ? styles['is-active'] : ''}`}
                data-tooltip={TOOLTIPS.STRIKE}
            >
                <BiStrikethrough />
            </button>
            <button
                onClick={toggleBulletList}
                className={`${styles['menu-button']} ${isActive.bulletList ? styles['is-active'] : ''}`}
                data-tooltip={TOOLTIPS.BULLET_LIST}
            >
                <BiListUl />
            </button>
            <button
                onClick={toggleOrderedList}
                className={`${styles['menu-button']} ${isActive.orderedList ? styles['is-active'] : ''}`}
                data-tooltip={TOOLTIPS.ORDERED_LIST}
            >
                <BiListOl />
            </button>
            <div className={styles['menu-dropdown']}>
                <button
                    onClick={() => setShowAlignMenu(!showAlignMenu)}
                    className={styles['menu-button']}
                    data-tooltip="Text Alignment"
                >
                    <BiAlignLeft />
                </button>
                {showAlignMenu && (
                    <div className={styles['dropdown-menu']}>
                        {alignmentOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleAlignment(option.value)}
                                className={`${styles['menu-button']} ${editor?.isActive({ textAlign: option.value }) ? styles['is-active'] : ''}`}
                                data-tooltip={option.tooltip}
                            >
                                <option.icon />
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className={styles.separator} />
            <button
                onClick={toggleCodeBlock}
                className={`${styles['menu-button']} ${isActive.codeBlock ? styles['is-active'] : ''}`}
                data-tooltip={TOOLTIPS.CODE_BLOCK}
            >
                <BiCodeAlt />
            </button>
            <div className={styles.separator} />
            <button
                onClick={() => setShowRawOutput(!showRawOutput)}
                className={`${styles['menu-button']} ${showRawOutput ? styles['is-active'] : ''}`}
                data-tooltip={TOOLTIPS.RAW_OUTPUT}
            >
                <BiData />
            </button>
        </div>
    );
}; 