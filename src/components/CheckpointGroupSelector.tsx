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
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{t('selectCheckpointGroup')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          {t('selectCheckpointGroup')}
        </CardTitle>
        <CardDescription>
          {t('selectGroupDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Option to patrol all groups */}
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md border-2 ${
            selectedGroupId === null ? 'border-primary bg-primary/5' : 'border-muted'
          }`}
          onClick={() => setSelectedGroupId(null)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    {t('allCheckpointGroups')}
                  </h3>
                  <Badge variant="secondary">
                    {groups.reduce((sum, g) => sum + g.checkpoint_count, 0)} σημεία
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('patrolAllGroups')}
                </p>
              </div>
              {selectedGroupId === null && (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Individual groups */}
        {groups.map((group) => (
          <Card 
            key={group.id}
            className={`cursor-pointer transition-all hover:shadow-md border-2 ${
              selectedGroupId === group.id ? 'border-primary bg-primary/5' : 'border-muted'
            }`}
            onClick={() => setSelectedGroupId(group.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {group.color && (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: group.color }}
                      />
                    )}
                    <h3 className="font-semibold text-foreground">{group.name}</h3>
                    <Badge variant="secondary">
                      {group.checkpoint_count} σημεία
                    </Badge>
                    {group.is_required && (
                      <Badge variant="destructive" className="text-xs">
                        Υποχρεωτική
                      </Badge>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {group.description}
                    </p>
                  )}
                  {group.completion_percentage_required && group.completion_percentage_required < 100 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Απαιτείται {group.completion_percentage_required}% ολοκλήρωση
                    </p>
                  )}
                </div>
                {selectedGroupId === group.id && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-2 pt-4">
          <Button onClick={onCancel} variant="outline" className="flex-1">
            {t('cancel')}
          </Button>
          <Button 
            onClick={handleStartPatrol} 
            className="flex-1"
            disabled={selectedGroupId === undefined}
          >
            {t('startPatrol')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};