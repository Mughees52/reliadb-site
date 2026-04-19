import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { EditorView, keymap, placeholder as phPlugin } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap } from '@codemirror/commands'
import { sql, MySQL } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'

export interface CodeMirrorOptions {
  initialValue?: string
  placeholder?: string
  height?: string
  readOnly?: boolean
  onExecute?: () => void
  onChange?: (value: string) => void
}

export function useCodeMirror(
  containerRef: Ref<HTMLElement | null>,
  options: CodeMirrorOptions = {}
) {
  const editor = ref<EditorView | null>(null)

  function createEditor(parent: HTMLElement) {
    const extensions = [
      keymap.of(defaultKeymap),
      sql({ dialect: MySQL }),
      EditorView.lineWrapping,
      oneDark,
      EditorView.theme({
        '&': { height: options.height || '150px' },
        '.cm-scroller': { overflow: 'auto' },
        '.cm-content': { fontFamily: 'monospace', fontSize: '13px' },
      }),
    ]

    if (options.placeholder) {
      extensions.push(phPlugin(options.placeholder))
    }

    if (options.onChange) {
      const cb = options.onChange
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            cb(update.state.doc.toString())
          }
        })
      )
    }

    if (options.onExecute) {
      const cb = options.onExecute
      extensions.push(
        keymap.of([{
          key: 'Ctrl-Enter',
          mac: 'Cmd-Enter',
          run: () => { cb(); return true },
        }])
      )
    }

    if (options.readOnly) {
      extensions.push(EditorState.readOnly.of(true))
    }

    return new EditorView({
      state: EditorState.create({
        doc: options.initialValue || '',
        extensions,
      }),
      parent,
    })
  }

  onMounted(() => {
    if (containerRef.value) {
      editor.value = createEditor(containerRef.value)
    }
  })

  onUnmounted(() => {
    editor.value?.destroy()
  })

  function getValue(): string {
    return editor.value?.state.doc.toString() || ''
  }

  function setValue(value: string) {
    if (!editor.value) return
    editor.value.dispatch({
      changes: {
        from: 0,
        to: editor.value.state.doc.length,
        insert: value,
      },
    })
  }

  function focus() {
    editor.value?.focus()
  }

  return { editor, getValue, setValue, focus }
}
