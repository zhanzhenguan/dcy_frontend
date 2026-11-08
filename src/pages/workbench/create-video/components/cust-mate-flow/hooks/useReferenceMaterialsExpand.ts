import { useEffect, useImperativeHandle, useRef, useState } from 'react'

export type ReferenceMaterialsExpandHandle = {
  closeMentionPopover: () => void
  expandMaterials: () => void
  scheduleCollapseMaterials: () => void
}

export const useReferenceMaterialsExpand = (
  ref: React.ForwardedRef<ReferenceMaterialsExpandHandle>
) => {
  const [refMentionOpen, setRefMentionOpen] = useState(false)
  const [materialsExpanded, setMaterialsExpanded] = useState(false)
  const refMentionOpenRef = useRef(false)
  const materialsHoveredRef = useRef(false)
  const materialsDraggingRef = useRef(false)
  const materialsExpandTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const materialsCollapseTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const cancelCollapseMaterials = () => {
    if (materialsCollapseTimer.current) {
      clearTimeout(materialsCollapseTimer.current)
      materialsCollapseTimer.current = null
    }
  }

  const scheduleCollapseMaterials = () => {
    // 面板打开或拖拽排序中不收起素材条
    if (refMentionOpenRef.current || materialsDraggingRef.current) return
    if (materialsExpandTimer.current) {
      clearTimeout(materialsExpandTimer.current)
      materialsExpandTimer.current = null
    }
    if (materialsCollapseTimer.current) return
    materialsCollapseTimer.current = setTimeout(() => {
      materialsCollapseTimer.current = null
      setMaterialsExpanded(false)
    }, 100)
  }

  const closeMentionPopover = () => {
    refMentionOpenRef.current = false
    setRefMentionOpen(false)
    // 面板常驻时素材条可能已离焦未收起；关闭面板后补一次收起
    if (!materialsHoveredRef.current && !materialsDraggingRef.current) {
      scheduleCollapseMaterials()
    }
  }

  /** 仅点击打开；X / 再点 + 收起 */
  const toggleRefMention = () => {
    if (refMentionOpenRef.current) {
      closeMentionPopover()
      return
    }
    cancelCollapseMaterials()
    setMaterialsExpanded(true)
    refMentionOpenRef.current = true
    setRefMentionOpen(true)
  }

  const expandMaterials = () => {
    cancelCollapseMaterials()
    if (materialsExpandTimer.current) {
      clearTimeout(materialsExpandTimer.current)
      materialsExpandTimer.current = null
    }
    setMaterialsExpanded(true)
  }

  const openMaterialsExpanded = () => {
    materialsHoveredRef.current = true
    cancelCollapseMaterials()
    if (materialsExpanded) return
    if (materialsExpandTimer.current) return
    materialsExpandTimer.current = setTimeout(() => {
      materialsExpandTimer.current = null
      setMaterialsExpanded(true)
    }, 80)
  }

  const handleScheduleCollapseMaterials = () => {
    if (materialsDraggingRef.current) return
    materialsHoveredRef.current = false
    scheduleCollapseMaterials()
  }

  const keepMaterialsExpandedForPopover = () => {
    materialsHoveredRef.current = true
    cancelCollapseMaterials()
  }

  const setMaterialsDragging = (dragging: boolean) => {
    materialsDraggingRef.current = dragging
    if (dragging) {
      cancelCollapseMaterials()
      setMaterialsExpanded(true)
      return
    }
    if (!materialsHoveredRef.current && !refMentionOpenRef.current) {
      scheduleCollapseMaterials()
    }
  }

  useImperativeHandle(ref, () => ({
    closeMentionPopover,
    expandMaterials,
    scheduleCollapseMaterials: handleScheduleCollapseMaterials,
  }))

  useEffect(() => {
    return () => {
      if (materialsExpandTimer.current) clearTimeout(materialsExpandTimer.current)
      if (materialsCollapseTimer.current) {
        clearTimeout(materialsCollapseTimer.current)
      }
    }
  }, [])

  return {
    refMentionOpen,
    materialsExpanded,
    closeMentionPopover,
    toggleRefMention,
    openMaterialsExpanded,
    scheduleCollapseMaterials: handleScheduleCollapseMaterials,
    keepMaterialsExpandedForPopover,
    setMaterialsDragging,
  }
}
