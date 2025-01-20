interface AIResponseProps {
  response: string
}

export default function AIResponse({ response }: AIResponseProps) {
  return <p className="text-gray-700 whitespace-pre-wrap">{response}</p>
}

