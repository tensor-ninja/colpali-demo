import Image from "next/image"

interface ImagePatchGridProps {
  patches: string[]
}

export default function ImagePatchGrid({ patches }: ImagePatchGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {patches.map((patch, index) => (
        <div key={index} className="aspect-square relative">
          <Image
            src={patch || "/placeholder.svg"}
            alt={`Image patch ${index + 1}`}
            fill
            className="object-cover rounded-md"
          />
        </div>
      ))}
    </div>
  )
}

