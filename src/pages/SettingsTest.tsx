import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useBlossomServers } from '@/hooks/useBlossomServers';
import { useAuthor } from '@/hooks/useAuthor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsTest() {
  const { user } = useCurrentUser();
  const { config: _config } = useAppContext();
  
  console.log('SettingsTest: About to call useBlossomServers');
  const blossomData = useBlossomServers();
  console.log('SettingsTest: useBlossomServers returned:', blossomData);
  
  console.log('SettingsTest: About to call useAuthor');
  const { data: authorData } = useAuthor(user?.pubkey);
  console.log('SettingsTest: useAuthor returned:', authorData);
  
  const [testState, setTestState] = useState('initial');

  console.log('SettingsTest: Rendering with user:', user?.pubkey);

  if (!user) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Login Required</h2>
              <p className="text-muted-foreground">Please log in to access settings</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Settings Test Page</CardTitle>
          <CardDescription>Testing basic settings functionality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <strong>User Pubkey:</strong> {user.pubkey}
            </div>
            <div>
              <strong>Test State:</strong> {testState}
            </div>
            <button 
              onClick={() => setTestState('clicked')}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Test Button
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}