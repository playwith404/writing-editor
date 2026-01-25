"use client"

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

interface MentionListProps {
    items: any[]
    command: (props: any) => void
}

export const MentionList = forwardRef((props: MentionListProps, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const selectItem = (index: number) => {
        const item = props.items[index]

        if (item) {
            props.command({ id: item })
        }
    }

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
    }

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length)
    }

    const enterHandler = () => {
        selectItem(selectedIndex)
    }

    useEffect(() => setSelectedIndex(0), [props.items])

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                upHandler()
                return true
            }

            if (event.key === 'ArrowDown') {
                downHandler()
                return true
            }

            if (event.key === 'Enter') {
                enterHandler()
                return true
            }

            return false
        },
    }))

    return (
        <div className="bg-popover text-popover-foreground border rounded-md shadow-md overflow-hidden p-1 min-w-[8rem]">
            {props.items.length ? (
                props.items.map((item, index) => (
                    <button
                        className={`
              flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none
              ${index === selectedIndex ? 'bg-accent text-accent-foreground' : ''}
            `}
                        key={index}
                        onClick={() => selectItem(index)}
                    >
                        {item}
                    </button>
                ))
            ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No result
                </div>
            )}
        </div>
    )
})
MentionList.displayName = 'MentionList'
