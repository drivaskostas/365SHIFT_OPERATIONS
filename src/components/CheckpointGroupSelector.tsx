import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, MapPin } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface CheckpointGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_required: boolean | null;
  completion_percentage_required: number | null;
  order_index: number | null;
  checkpoint_count: number;
}

interface CheckpointGroupSelectorProps {
  siteId: string;
  onSelectGroup: (groupId: string | null) => void;
  onCancel: () => void;
}

export const CheckpointGroupSelector = ({ 
  siteId, 
  onSelectGroup, 
  onCancel 
}: CheckpointGroupSelectorProps) => {
  const [groups, setGroups] = useState<CheckpointGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLanguage();

  useEffect(() => {
    fetchCheckpointGroups();
  }, [siteId]);

  const fetchCheckpointGroups = async () => {
    try {
      setLoading(true);
      
      // Get checkpoint groups for this site
      const { data: groupsData, error: groupsError } = await supabase
        .from('checkpoint_groups')
        .select(`
          id,
          name,
          description,
          color,
          is_required,
          completion_percentage_required,
          order_index
        `)
        .eq('site_id', siteId)
        .order('order_index', { ascending: true });

      if (groupsError) throw groupsError;

      // Get checkpoint count for each group
      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count, error: countError } = await supabase
            .from('guardian_checkpoints')
            .select('*', { count: 'exact', head: true })
            .eq('checkpoint_group_id', group.id)
            .eq('active', true);

          if (countError) {
            console.error('Error counting checkpoints:', countError);
            return { ...group, checkpoint_count: 0 };
          }

          return { ...group, checkpoint_count: count || 0 };
        })
      );

      setGroups(groupsWithCounts);
    } catch (error) {
      console.error('Error fetching checkpoint groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPatrol = () => {
    onSelectGroup(selectedGroupId);
  };

  const handleSelectAll = () => {
    onSelectGroup(null); // null means patrol all groups
  };

  if (loading) {
    return (
      <div className="w-full max-w-lg mx-auto animate-fade-in">
        <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-6">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto"></div>
            <p className="text-sm text-muted-foreground">{t('selectCheckpointGroup')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto animate-fade-in">
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">{t('selectCheckpointGroup')}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('selectGroupDescription')}
          </p>
        </div>

        {/* Options */}
        <div className="p-4 space-y-2">
          {/* Option to patrol all groups */}
          <div 
            className={`group relative overflow-hidden rounded-lg border transition-all duration-200 cursor-pointer hover:scale-[1.01] ${
              selectedGroupId === null 
                ? 'border-primary bg-primary/8 shadow-sm' 
                : 'border-border/60 hover:border-border hover:bg-muted/30'
            }`}
            onClick={() => setSelectedGroupId(null)}
          >
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground text-sm truncate">
                      {t('allCheckpointGroups')}
                    </h3>
                    <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5">
                      {groups.reduce((sum, g) => sum + g.checkpoint_count, 0)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('patrolAllGroups')}
                  </p>
                </div>
                <div className={`transition-all duration-200 ${selectedGroupId === null ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
              </div>
            </div>
            {selectedGroupId === null && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50" />
            )}
          </div>

          {/* Individual groups */}
          {groups.map((group, index) => (
            <div 
              key={group.id}
              className={`group relative overflow-hidden rounded-lg border transition-all duration-200 cursor-pointer hover:scale-[1.01] ${
                selectedGroupId === group.id 
                  ? 'border-primary bg-primary/8 shadow-sm' 
                  : 'border-border/60 hover:border-border hover:bg-muted/30'
              }`}
              style={{ 
                animationDelay: `${index * 50}ms`,
                animation: 'fade-in 0.3s ease-out forwards'
              }}
              onClick={() => setSelectedGroupId(group.id)}
            >
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {group.color && (
                        <div 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: group.color }}
                        />
                      )}
                      <h3 className="font-medium text-foreground text-sm truncate">{group.name}</h3>
                      <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5 flex-shrink-0">
                        {group.checkpoint_count}
                      </Badge>
                      {group.is_required && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0.5 h-5 flex-shrink-0">
                          Required
                        </Badge>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {group.description}
                      </p>
                    )}
                    {group.completion_percentage_required && group.completion_percentage_required < 100 && (
                      <p className="text-xs text-muted-foreground/80 mt-0.5">
                        {group.completion_percentage_required}% required
                      </p>
                    )}
                  </div>
                  <div className={`transition-all duration-200 ${selectedGroupId === group.id ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </div>
              {selectedGroupId === group.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50" />
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 pt-2">
          <div className="flex gap-2">
            <Button 
              onClick={onCancel} 
              variant="ghost" 
              size="sm"
              className="flex-1 h-9 text-xs font-medium"
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleStartPatrol} 
              size="sm"
              className="flex-1 h-9 text-xs font-medium transition-all duration-200 hover:scale-105"
              disabled={selectedGroupId === undefined}
            >
              {t('startPatrol')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};