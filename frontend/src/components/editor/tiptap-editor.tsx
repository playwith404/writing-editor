"use client"

import clsx from "clsx"
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
    containerClassName?: string
    editorClassName?: string
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

export function TipTapEditor({ content, onChange, onReady, containerClassName, editorClassName }: TipTapEditorProps) {
    const applyingRef = useRef(false)
    const editor = useEditor({
        immediatelyRender: false,
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
                class: clsx(
                    "prose prose-stone prose-headings:font-semibold prose-p:text-[#3f3b35] prose-li:text-[#3f3b35] prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl max-w-none min-h-[70vh] px-14 py-12 text-[16px] leading-8 focus:outline-none",
                    editorClassName
                ),
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
        <div className={clsx("mx-auto min-h-[82vh] w-full max-w-5xl rounded-2xl border border-[#e9e1d6] bg-white shadow-[0_18px_55px_-35px_rgba(73,53,35,0.35)]", containerClassName)}>
            <EditorContent editor={editor} />
        </div>
    )
}
