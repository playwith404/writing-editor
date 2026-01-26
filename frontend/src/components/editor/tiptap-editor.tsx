"use client"

import { Editor, useEditor, EditorContent, ReactRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import tippy from 'tippy.js'
import { useEffect, useRef } from 'react'
import { MentionList } from './mention-list'

interface TipTapEditorProps {
    content?: string
    onChange?: (content: string) => void
    onReady?: (editor: Editor) => void
}

const suggestion = {
    items: ({ query }: { query: string }) => {
        return [
            '엘라라 밴스',
            '카엘렌',
            '은빛 성채',
            '마법 체계',
        ].filter(item => item.toLowerCase().startsWith(query.toLowerCase())).slice(0, 5)
    },
    render: () => {
        let component: ReactRenderer<any> | null = null
        let popup: any | null = null

        return {
            onStart: (props: any) => {
                component = new ReactRenderer(MentionList, {
                    props,
                    editor: props.editor,
                })

                if (!props.clientRect) {
                    return
                }

                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                })
            },
            onUpdate(props: any) {
                component?.updateProps(props)

                if (!props.clientRect) {
                    return
                }

                popup[0].setProps({
                    getReferenceClientRect: props.clientRect,
                })
            },
            onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                    popup[0].hide()
                    return true
                }
                return component?.ref?.onKeyDown(props)
            },
            onExit() {
                popup[0].destroy()
                component?.destroy()
            },
        }
    },
}

export function TipTapEditor({ content, onChange, onReady }: TipTapEditorProps) {
    const applyingRef = useRef(false)
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                }
            }),
            Mention.configure({
                HTMLAttributes: {
                    class: 'bg-primary/20 text-primary rounded px-1',
                },
                suggestion,
            }),
        ],
        content: content ?? '<p></p>',
        editorProps: {
            attributes: {
                class: 'prose prose-stone dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-8 py-6',
            },
        },
        onUpdate: ({ editor }) => {
            if (applyingRef.current) return
            onChange?.(editor.getHTML())
        }
    })

    useEffect(() => {
        if (!editor) return
        if (content === undefined) return
        if (editor.getHTML() === content) return

        applyingRef.current = true
        try {
            editor.commands.setContent(content || '<p></p>', { emitUpdate: false })
        } finally {
            applyingRef.current = false
        }
    }, [content, editor])

    useEffect(() => {
        if (!editor) return
        onReady?.(editor)
    }, [editor, onReady])

    if (!editor) {
        return null
    }

    return (
        <div className="w-full max-w-4xl mx-auto bg-background rounded-lg shadow-sm border min-h-[80vh]">
            <EditorContent editor={editor} />
        </div>
    )
}
