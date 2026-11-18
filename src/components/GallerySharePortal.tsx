import { useRef } from 'react'
import { type GalleryHaiku } from '../lib/gallery'
import { formatShareParam } from '../lib/haiku'
import { formatStyleParam } from '../lib/style'
import { useShareRenders } from '../lib/useShareRenders'
import { Artboards } from './ShareArtboards'
import { ShareDialog } from './ShareDialog'

export interface GallerySharePortalProps {
  item: GalleryHaiku
  onClose: () => void
}

/** Renders the postcards for one gallery haiku and shows them in the share dialog. */
export function GallerySharePortal({ item, onClose }: GallerySharePortalProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const renders = useShareRenders(rootRef, item.haiku, item.style, true)
  const shareUrl = () => {
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    url.searchParams.set('h', formatShareParam(item.haiku))
    url.searchParams.set('s', formatStyleParam(item.style))
    return url.toString()
  }
  return (
    <>
      <ShareDialog renders={renders} shareUrl={shareUrl} onClose={onClose} />
      <div ref={rootRef}>
        <Artboards haiku={item.haiku} style={item.style} />
      </div>
    </>
  )
}
