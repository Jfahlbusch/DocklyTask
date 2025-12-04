'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Smile, icons as LucideIcons } from 'lucide-react';

const productSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  description: z.string().optional(),
  icon: z.string().optional(),
  iconType: z.enum(['emoji', 'lucide', 'custom']).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Product {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductFormProps {
  product?: Product | null;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Beliebte Emoji-Icons für Produkte
const EMOJI_CATEGORIES = {
  'Geschäft': ['📦', '💼', '🏢', '🏪', '🏭', '💰', '💵', '💳', '🧾', '📊', '📈', '📉'],
  'Technik': ['💻', '🖥️', '📱', '⌨️', '🖱️', '💾', '📀', '🔌', '🔋', '📡', '🛰️', '🤖'],
  'Tools': ['🔧', '🔨', '⚙️', '🛠️', '🔩', '⛏️', '🪛', '🪚', '🔗', '⚡', '🔥', '💡'],
  'Kommunikation': ['📧', '📨', '📩', '📬', '📭', '📮', '📝', '📄', '📃', '📑', '📰', '🗞️'],
  'Cloud & Web': ['☁️', '🌐', '🔒', '🔓', '🔑', '🗝️', '🛡️', '🔐', '🌍', '🌎', '🌏', '🔗'],
  'Kreativ': ['🎨', '🖌️', '🖍️', '✏️', '🎬', '📷', '📸', '🎥', '🎞️', '📹', '🎙️', '🎧'],
  'Sterne & Auszeichnungen': ['⭐', '🌟', '✨', '💫', '🏆', '🥇', '🥈', '🥉', '🎖️', '🏅', '💎', '👑'],
  'Transport': ['🚀', '✈️', '🚁', '🚢', '🚗', '🚕', '🚌', '🚎', '🛒', '📦', '📫', '📪'],
  'Natur & Wachstum': ['🌱', '🌲', '🌳', '🌴', '🌵', '🌷', '🌸', '🌹', '🌺', '🌻', '🌼', '🍀'],
  'Symbole': ['✅', '❌', '⚠️', '❗', '❓', '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣'],
};

// Beliebte Lucide Icons für Produkte (unique list)
const POPULAR_LUCIDE_ICONS = [
  'Package', 'Box', 'Boxes', 'Archive', 'ShoppingCart', 'ShoppingBag',
  'Briefcase', 'Building', 'Building2', 'Factory', 'Store', 'Warehouse',
  'Laptop', 'Monitor', 'Smartphone', 'Tablet', 'Server', 'Database',
  'Cloud', 'CloudCog', 'Globe', 'Globe2', 'Network', 'Wifi',
  'Settings', 'Settings2', 'Wrench', 'Hammer', 'Cog', 'Anvil',
  'Lock', 'Unlock', 'Shield', 'ShieldCheck', 'Key', 'KeyRound',
  'Mail', 'MessageSquare', 'MessageCircle', 'Send', 'Inbox', 'FileText',
  'Palette', 'Paintbrush', 'Camera', 'Video', 'Image', 'Music',
  'Star', 'Heart', 'ThumbsUp', 'Award', 'Trophy', 'Crown',
  'Rocket', 'Plane', 'Car', 'Truck', 'Ship', 'Train',
  'Zap', 'Bolt', 'Flame', 'Sun', 'Moon', 'Sparkles',
  'Users', 'User', 'UserPlus', 'UserCheck', 'UserCog', 'Users2',
  'CreditCard', 'DollarSign', 'Euro', 'Wallet', 'PiggyBank', 'Coins',
  'BarChart', 'BarChart2', 'LineChart', 'PieChart', 'TrendingUp', 'Activity',
  'Check', 'CheckCircle', 'CheckSquare', 'X', 'XCircle', 'AlertCircle',
  'Calendar', 'Clock', 'Timer', 'Hourglass', 'Watch', 'Alarm',
  'Folder', 'FolderOpen', 'File', 'Files', 'FileCode', 'FileJson',
  'Code', 'Code2', 'Terminal', 'Command', 'Binary', 'Cpu',
  'Home', 'Bookmark', 'Flag', 'Pin', 'MapPin', 'Navigation',
  'Eye', 'EyeOff', 'Search', 'Filter', 'SlidersHorizontal', 'Sliders',
];

export default function ProductForm({ 
  product, 
  onSubmit, 
  onCancel, 
  open, 
  onOpenChange 
}: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [emojiCategory, setEmojiCategory] = useState<string>('Geschäft');

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      icon: product?.icon || '📦',
      iconType: 'emoji',
    },
  });

  // Detect icon type from existing icon
  const detectIconType = (icon: string | undefined): 'emoji' | 'lucide' | 'custom' => {
    if (!icon) return 'emoji';
    if (icon.startsWith('lucide:')) return 'lucide';
    // Check if it's an emoji (simplified check)
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/u;
    if (emojiRegex.test(icon)) return 'emoji';
    return 'custom';
  };

  // Reset form wenn Dialog geöffnet wird oder Produkt wechselt
  useEffect(() => {
    if (open) {
      const iconType = detectIconType(product?.icon);
      form.reset({
        name: product?.name || '',
        description: product?.description || '',
        icon: product?.icon || '📦',
        iconType,
      });
    }
  }, [open, product, form]);

  const handleSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      // Remove iconType from data before submitting
      const { iconType, ...submitData } = data;
      await onSubmit(submitData);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedIcon = form.watch('icon');
  const selectedIconType = form.watch('iconType');

  // Filter Lucide icons based on search
  const filteredLucideIcons = useMemo(() => {
    if (!iconSearch) return POPULAR_LUCIDE_ICONS;
    const search = iconSearch.toLowerCase();
    return POPULAR_LUCIDE_ICONS.filter(icon => 
      icon.toLowerCase().includes(search)
    );
  }, [iconSearch]);

  // Render icon preview
  const renderIconPreview = () => {
    if (!selectedIcon) return <span className="text-4xl">📦</span>;
    
    if (selectedIcon.startsWith('lucide:')) {
      const iconName = selectedIcon.replace('lucide:', '') as keyof typeof LucideIcons;
      const LucideIcon = LucideIcons[iconName];
      if (LucideIcon) {
        return <LucideIcon className="w-10 h-10" />;
      }
    }
    
    return <span className="text-4xl">{selectedIcon}</span>;
  };

  // Render Lucide icon button
  const renderLucideIcon = (iconName: string) => {
    const LucideIcon = LucideIcons[iconName as keyof typeof LucideIcons];
    if (!LucideIcon) return null;
    
    const iconValue = `lucide:${iconName}`;
    const isSelected = selectedIcon === iconValue;
    
    return (
      <button
        key={iconName}
        type="button"
        onClick={() => form.setValue('icon', iconValue)}
        title={iconName}
        className={`
          p-2 rounded-lg transition-all hover:scale-110 flex items-center justify-center
          ${isSelected 
            ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500' 
            : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}
        `}
      >
        <LucideIcon className="w-5 h-5" />
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[85vw] min-w-[900px] max-w-[1400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Produkt bearbeiten' : 'Neues Produkt erstellen'}
          </DialogTitle>
          <DialogDescription>
            {product 
              ? 'Bearbeiten Sie die Details des bestehenden Produkts.'
              : 'Erstellen Sie ein neues Produkt für Ihr Portfolio.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Produktname" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <FormDescription>
                    Wählen Sie ein Icon für Ihr Produkt aus Emojis, Lucide Icons oder geben Sie ein eigenes ein
                  </FormDescription>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Icon Preview */}
                      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                          {renderIconPreview()}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Ausgewähltes Icon</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedIcon?.startsWith('lucide:') 
                              ? `Lucide: ${selectedIcon.replace('lucide:', '')}`
                              : selectedIcon || 'Kein Icon ausgewählt'}
                          </p>
                        </div>
                      </div>

                      {/* Icon Selection Tabs */}
                      <Tabs defaultValue="emoji" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="emoji" className="gap-2">
                            <Smile className="w-4 h-4" />
                            Emojis
                          </TabsTrigger>
                          <TabsTrigger value="lucide" className="gap-2">
                            <Search className="w-4 h-4" />
                            Icons
                          </TabsTrigger>
                          <TabsTrigger value="custom" className="gap-2">
                            ✏️ Eigenes
                          </TabsTrigger>
                        </TabsList>

                        {/* Emoji Tab */}
                        <TabsContent value="emoji" className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {Object.keys(EMOJI_CATEGORIES).map((category) => (
                              <Button
                                key={category}
                                type="button"
                                variant={emojiCategory === category ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setEmojiCategory(category)}
                              >
                                {category}
                              </Button>
                            ))}
                          </div>
                          <ScrollArea className="h-[180px] rounded-md border p-3">
                            <div className="grid grid-cols-8 gap-2">
                              {EMOJI_CATEGORIES[emojiCategory as keyof typeof EMOJI_CATEGORIES]?.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => form.setValue('icon', emoji)}
                                  className={`
                                    text-2xl p-2 rounded-lg transition-all hover:scale-110
                                    ${selectedIcon === emoji 
                                      ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500' 
                                      : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}
                                  `}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </TabsContent>

                        {/* Lucide Icons Tab */}
                        <TabsContent value="lucide" className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              placeholder="Icons suchen..."
                              value={iconSearch}
                              onChange={(e) => setIconSearch(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                          <ScrollArea className="h-[180px] rounded-md border p-3">
                            <div className="grid grid-cols-8 gap-2">
                              {filteredLucideIcons.map(renderLucideIcon)}
                            </div>
                            {filteredLucideIcons.length === 0 && (
                              <p className="text-center text-gray-500 py-4">
                                Keine Icons gefunden
                              </p>
                            )}
                          </ScrollArea>
                        </TabsContent>

                        {/* Custom Icon Tab */}
                        <TabsContent value="custom" className="space-y-3">
                          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">
                                Eigenes Emoji oder Text eingeben
                              </label>
                              <Input 
                                placeholder="z.B. 🎉 oder einen kurzen Text" 
                                value={field.value || ''}
                                onChange={(e) => form.setValue('icon', e.target.value)}
                              />
                            </div>
                            <p className="text-xs text-gray-500">
                              Tipp: Kopieren Sie ein Emoji von einer Website oder verwenden Sie 
                              die Emoji-Tastatur (Windows: Win+. / Mac: Cmd+Ctrl+Leertaste)
                            </p>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschreibung</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Beschreiben Sie das Produkt..." 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting 
                  ? 'Wird gespeichert...' 
                  : product 
                    ? 'Aktualisieren' 
                    : 'Erstellen'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
