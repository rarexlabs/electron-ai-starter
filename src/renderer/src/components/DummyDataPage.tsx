import { ArrowLeft } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { DummyDataManager } from '@renderer/components/DummyDataManager'

interface DummyDataPageProps {
  onBack: () => void
}

export function DummyDataPage({ onBack }: DummyDataPageProps): React.JSX.Element {
  return (
    <div className="h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-4xl font-bold text-gray-900">Dummy Data</h1>
          </div>
        </div>

        <div className="space-y-6">
          <DummyDataManager />
        </div>
      </div>
    </div>
  )
}