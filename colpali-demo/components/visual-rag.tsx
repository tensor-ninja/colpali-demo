"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import ImagePatchGrid from "./image-patch-grid"
import AIResponse from "./ai-response"

export default function VisualRAG() {
  const [question, setQuestion] = useState("")
  const [imagePatches, setImagePatches] = useState<string[]>([])
  const [aiResponse, setAIResponse] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setAIResponse("") // Clear previous response
    setImagePatches([]) // Clear previous images
    
    console.log("Sending request with question:", question)

    try {
      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: question }),
      })
      
      console.log("Response status:", response.status)
      const responseText = await response.text()
      console.log("Raw response:", responseText)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`)
      }

      const data = JSON.parse(responseText)
      console.log("Parsed data:", data)

      if (data.images && Array.isArray(data.images)) {
        const imageUrls = data.images.map((base64: string) => `data:image/png;base64,${base64}`)
        setImagePatches(imageUrls)
        setAIResponse("Images retrieved successfully")
      } else {
        setAIResponse("No images were returned from the server")
      }
    } catch (error) {
      console.error("Error details:", error)
      setAIResponse(`Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Visual Question Answering</h1>
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <Input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about the image..."
            className="flex-grow"
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Processing..." : "Submit"}
          </Button>
        </div>
      </form>
      {imagePatches.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-2">Relevant Image Patches</h2>
            <ImagePatchGrid patches={imagePatches} />
          </CardContent>
        </Card>
      )}
      {aiResponse && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-2">AI Response</h2>
            <AIResponse response={aiResponse} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}