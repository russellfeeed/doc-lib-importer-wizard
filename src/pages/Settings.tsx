import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Download, Upload, RotateCcw, Save, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { 
  getAllPromptConfigs, 
  savePromptConfig, 
  resetPromptConfig, 
  resetAllPromptConfigs,
  exportPromptConfigs,
  importPromptConfigs,
  getDefaultPrompts,
  type PromptConfig,
  type AllPromptConfigs 
} from '@/utils/promptManager';

const promptConfigSchema = z.object({
  systemPrompt: z.string().min(1, 'System prompt is required'),
  userPromptTemplate: z.string().min(1, 'User prompt template is required'),
  model: z.string().min(1, 'Model is required'),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(1).max(4000)
});

const AVAILABLE_MODELS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4-turbo',
  'gpt-3.5-turbo'
];

const PROMPT_DESCRIPTIONS = {
  summarization: 'Controls how documents are summarized for quick overview',
  categorization: 'Determines how documents are automatically categorized',
  tagGeneration: 'Defines how relevant tags are generated for documents',
  circularLetters: 'Extracts structured data from circular letters and announcements',
  standardsCategorization: 'Categorizes standards documents as System or Service standards'
};

const Settings: React.FC = () => {
  const [configs, setConfigs] = useState<AllPromptConfigs>(getAllPromptConfigs());
  const [activeTab, setActiveTab] = useState<keyof AllPromptConfigs>('summarization');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');

  const form = useForm<PromptConfig>({
    resolver: zodResolver(promptConfigSchema),
    defaultValues: configs[activeTab]
  });

  // Update form when tab changes
  React.useEffect(() => {
    form.reset(configs[activeTab]);
  }, [activeTab, configs, form]);

  const onSubmit = (data: PromptConfig) => {
    try {
      savePromptConfig(activeTab, data);
      setConfigs(prev => ({ ...prev, [activeTab]: data }));
      toast.success('Prompt configuration saved successfully');
    } catch (error) {
      toast.error('Failed to save configuration');
    }
  };

  const handleReset = () => {
    resetPromptConfig(activeTab);
    const newConfigs = getAllPromptConfigs();
    setConfigs(newConfigs);
    form.reset(newConfigs[activeTab]);
    toast.success('Configuration reset to default');
  };

  const handleResetAll = () => {
    resetAllPromptConfigs();
    const newConfigs = getAllPromptConfigs();
    setConfigs(newConfigs);
    form.reset(newConfigs[activeTab]);
    toast.success('All configurations reset to defaults');
  };

  const handleExport = () => {
    try {
      const exported = exportPromptConfigs();
      const blob = new Blob([exported], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'prompt-configurations.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Configuration exported successfully');
    } catch (error) {
      toast.error('Failed to export configuration');
    }
  };

  const handleImport = () => {
    try {
      importPromptConfigs(importText);
      const newConfigs = getAllPromptConfigs();
      setConfigs(newConfigs);
      form.reset(newConfigs[activeTab]);
      setImportDialogOpen(false);
      setImportText('');
      toast.success('Configuration imported successfully');
    } catch (error) {
      toast.error('Failed to import configuration: ' + (error as Error).message);
    }
  };

  const generatePreview = () => {
    const currentValues = form.getValues();
    const sampleData = {
      fileName: "Sample Document.pdf",
      content: "This is a sample document content for preview purposes...",
      categories: "Category A > Subcategory 1\nCategory B > Subcategory 2"
    };

    let preview = currentValues.userPromptTemplate;
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{${key}}`, 'g'), value);
    });

    return preview;
  };

  const currentConfig = form.getValues();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">AI Prompt Settings</h1>
          <p className="text-muted-foreground">
            Customize how AI processes your documents across different tasks
          </p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Config
        </Button>
        
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import Config
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Configuration</DialogTitle>
              <DialogDescription>
                Paste your exported configuration JSON below
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Paste configuration JSON here..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={10}
            />
            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={!importText.trim()}>
                Import
              </Button>
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button onClick={handleResetAll} variant="destructive">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset All to Defaults
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as keyof AllPromptConfigs)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="summarization">Summarization</TabsTrigger>
          <TabsTrigger value="categorization">Categorization</TabsTrigger>
          <TabsTrigger value="tagGeneration">Tag Generation</TabsTrigger>
          <TabsTrigger value="circularLetters">Circular Letters</TabsTrigger>
          <TabsTrigger value="standardsCategorization">Standards</TabsTrigger>
        </TabsList>

        {Object.entries(PROMPT_DESCRIPTIONS).map(([key, description]) => (
          <TabsContent key={key} value={key} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Prompt Preview</DialogTitle>
                          <DialogDescription>
                            How your prompt will look with sample data
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="font-semibold">System Prompt:</Label>
                            <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                              {currentConfig.systemPrompt}
                            </div>
                          </div>
                          <div>
                            <Label className="font-semibold">User Prompt (with sample data):</Label>
                            <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                              {generatePreview()}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button onClick={handleReset} variant="outline" size="sm">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="systemPrompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>System Prompt</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter the system prompt that defines the AI's role and behavior..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            The system message that sets the context and role for the AI
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="userPromptTemplate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>User Prompt Template</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter the user prompt template with placeholders like {fileName}, {content}, etc..."
                              className="min-h-[150px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            The prompt template sent to the AI. Use placeholders like {`{fileName}`}, {`{content}`}, {`{categories}`}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Model</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select model" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {AVAILABLE_MODELS.map((model) => (
                                  <SelectItem key={model} value={model}>
                                    {model}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              OpenAI model to use
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="temperature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Temperature</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="2"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              0 = focused, 2 = creative
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxTokens"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Tokens</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="4000"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Maximum response length
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit">
                        <Save className="mr-2 h-4 w-4" />
                        Save Configuration
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Alert>
              <AlertDescription>
                <strong>Available placeholders:</strong> {`{fileName}`}, {`{content}`}
                {key === 'categorization' && ', {categories}'}
                {key === 'circularLetters' && ' - Returns structured JSON data'}
                {key === 'standardsCategorization' && ' - Returns either "Standards > System" or "Standards > Service"'}
              </AlertDescription>
            </Alert>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Settings;