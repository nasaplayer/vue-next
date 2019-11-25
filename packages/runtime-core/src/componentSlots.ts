import { ComponentInternalInstance, currentInstance } from './component'
import { VNode, NormalizedChildren, normalizeVNode, VNodeChild } from './vnode'
import { isArray, isFunction, EMPTY_OBJ } from '@vue/shared'
import { ShapeFlags } from './shapeFlags'
import { warn } from './warning'
import { isKeepAlive } from './components/KeepAlive'

export type Slot = (...args: any[]) => VNode[]

export type InternalSlots = {
  [name: string]: Slot
}

export type Slots = Readonly<InternalSlots>

export type RawSlots = {
  [name: string]: unknown
  _compiled?: boolean
}

const normalizeSlotValue = (value: unknown): VNode[] =>
  isArray(value)
    ? value.map(normalizeVNode)
    : [normalizeVNode(value as VNodeChild)]

const normalizeSlot = (key: string, rawSlot: Function): Slot => (
  props: any
) => {
  if (__DEV__ && currentInstance != null) {
    warn(
      `Slot "${key}" invoked outside of the render function: ` +
        `this will not track dependencies used in the slot. ` +
        `Invoke the slot function inside the render function instead.`
    )
  }
  return normalizeSlotValue(rawSlot(props))
}

export function resolveSlots(
  instance: ComponentInternalInstance,
  children: NormalizedChildren
) {
  let slots: InternalSlots | void
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    const rawSlots = children as RawSlots
    if (rawSlots._compiled) {
      // pre-normalized slots object generated by compiler
      slots = children as Slots
    } else {
      slots = {}
      for (const key in rawSlots) {
        const value = rawSlots[key]
        if (isFunction(value)) {
          slots[key] = normalizeSlot(key, value)
        } else if (value != null) {
          if (__DEV__) {
            warn(
              `Non-function value encountered for slot "${key}". ` +
                `Prefer function slots for better performance.`
            )
          }
          const normalized = normalizeSlotValue(value)
          slots[key] = () => normalized
        }
      }
    }
  } else if (children !== null) {
    // non slot object children (direct value) passed to a component
    if (__DEV__ && !isKeepAlive(instance.vnode)) {
      warn(
        `Non-function value encountered for default slot. ` +
          `Prefer function slots for better performance.`
      )
    }
    const normalized = normalizeSlotValue(children)
    slots = { default: () => normalized }
  }
  instance.slots = slots || EMPTY_OBJ
}
