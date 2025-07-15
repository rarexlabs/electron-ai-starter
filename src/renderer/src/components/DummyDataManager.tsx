import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { logger } from '@renderer/lib/logger'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@renderer/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import { Input } from '@renderer/components/ui/input'

const dummyDataSchema = z.object({
  settingA: z
    .string()
    .min(1, {
      message: 'Setting A is required.'
    })
    .max(100, {
      message: 'Setting A must be 100 characters or less.'
    }),
  settingB: z
    .string()
    .min(1, {
      message: 'Setting B is required.'
    })
    .max(100, {
      message: 'Setting B must be 100 characters or less.'
    })
})

type DummyDataFormData = z.infer<typeof dummyDataSchema>

export function DummyDataManager(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const form = useForm<DummyDataFormData>({
    resolver: zodResolver(dummyDataSchema),
    defaultValues: {
      settingA: '',
      settingB: ''
    }
  })

  // Load dummy data on component mount
  useEffect(() => {
    const loadDummyData = async (): Promise<void> => {
      try {
        setIsLoading(true)
        await window.connectBackend()
        const dummyData = ((await window.backend.getSetting('dummy')) as DummyDataFormData) || {}

        form.setValue('settingA', dummyData.settingA || 'Default A')
        form.setValue('settingB', dummyData.settingB || 'Default B')
      } catch (error) {
        logger.error('Error loading dummy data:', error)
        setMessage({
          type: 'error',
          text: 'Failed to load dummy data. Please try again.'
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadDummyData()
  }, [form])

  const onSubmit = async (data: DummyDataFormData): Promise<void> => {
    try {
      setIsLoading(true)
      setMessage(null)

      await window.backend.setSetting('dummy', {
        settingA: data.settingA,
        settingB: data.settingB
      })

      setMessage({
        type: 'success',
        text: 'Dummy data saved successfully!'
      })
    } catch (error) {
      logger.error('Error saving dummy data:', error)
      setMessage({
        type: 'error',
        text: 'Failed to save dummy data. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Dummy Database Data</CardTitle>
        <CardDescription>Data are persisted to SQLITE DB.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="settingA"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Setting A</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Setting A value" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="settingB"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Setting B</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Setting B value" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        {message && (
          <div
            className={`mt-4 p-3 rounded-md text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={isLoading}
          className="flex items-center gap-2 ml-auto"
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </CardFooter>
    </Card>
  )
}
