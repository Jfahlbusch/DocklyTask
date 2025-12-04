'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Calendar,
  Edit,
  Save,
  X,
  Camera,
  Building2,
  Image as ImageIcon
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  avatar?: string;
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';
  customerId?: string;
  customer?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    giphyApiKey: ''
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock current user - in real app this would come from auth context
      const mockUser: UserProfile = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        phone: '+49 123 456789',
        avatar: undefined,
        role: 'ADMIN',
        customerId: undefined,
        customer: undefined,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      setUser(mockUser);
      setFormData({
        name: mockUser.name || '',
        email: mockUser.email,
        phone: mockUser.phone || '',
        giphyApiKey: (typeof window !== 'undefined' ? localStorage.getItem('giphyApiKey') || '' : ''),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email,
        phone: user.phone || '',
        giphyApiKey: (typeof window !== 'undefined' ? localStorage.getItem('giphyApiKey') || '' : ''),
      });
    }
  };

  const handleSave = async () => {
    try {
      // In real app, this would update the user profile via API
      console.log('Saving profile:', formData);
      
      // Mock update
      if (user) {
        setUser({
          ...user,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          updatedAt: new Date().toISOString(),
        });
      }
      
      setIsEditing(false);
      // Persistiere GIPHY Key im LocalStorage (Client-only)
      if (typeof window !== 'undefined') {
        if (formData.giphyApiKey?.trim()) {
          localStorage.setItem('giphyApiKey', formData.giphyApiKey.trim());
        } else {
          localStorage.removeItem('giphyApiKey');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
      console.error('Error saving profile:', err);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'MANAGER': return 'bg-blue-100 text-blue-800';
      case 'USER': return 'bg-green-100 text-green-800';
      case 'VIEWER': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Vollzugriff auf alle Funktionen und Einstellungen';
      case 'MANAGER': return 'Kann Projekte und Benutzer verwalten';
      case 'USER': return 'Kann Aufgaben und Projekte bearbeiten';
      case 'VIEWER': return 'Nur Lesezugriff auf Daten';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Profil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-red-600 mb-2">Fehler</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => {
                if (typeof window !== 'undefined') {
                  document.dispatchEvent(new CustomEvent('refetch:profile'));
                }
              }}>
                Erneut versuchen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Benutzer nicht gefunden</h2>
              <p className="text-gray-600">Bitte melden Sie sich erneut an.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mein Profil</h1>
            <p className="text-gray-600 mt-1">
              Verwalten Sie Ihre persönlichen Informationen und Einstellungen.
            </p>
          </div>
          {!isEditing && (
            <Button onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Bearbeiten
            </Button>
          )}
        </div>

        {/* Profile Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="relative inline-block">
                  <Avatar className="w-24 h-24 mx-auto mb-4">
                    <AvatarImage src={user.avatar || ''} alt={user.name} />
                    <AvatarFallback className="text-2xl">
                      {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute bottom-2 right-0 rounded-full p-1"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <h2 className="text-xl font-semibold">{user.name || 'Unbekannt'}</h2>
                <p className="text-gray-600">{user.email}</p>
                
                <div className="mt-4">
                  <Badge className={getRoleColor(user.role)}>
                    {user.role}
                  </Badge>
                </div>

                {user.customer && (
                  <div className="mt-4 flex items-center justify-center text-sm text-gray-600">
                    <Building2 className="h-4 w-4 mr-1" />
                    {user.customer.name}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Profile Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Profilinformationen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Persönliche Informationen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      {isEditing ? (
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ihr Name"
                        />
                      ) : (
                        <div className="mt-1 flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span>{user.name || 'Nicht angegeben'}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">E-Mail</label>
                      {isEditing ? (
                        <Input
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="ihre@email.de"
                          type="email"
                        />
                      ) : (
                        <div className="mt-1 flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <span>{user.email}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Telefon</label>
                      {isEditing ? (
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+49 123 456789"
                        />
                      ) : (
                        <div className="mt-1 flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <span>{user.phone || 'Nicht angegeben'}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Rolle</label>
                      <div className="mt-1 flex items-center">
                        <Shield className="h-4 w-4 text-gray-400 mr-2" />
                        <Badge className={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {getRoleDescription(user.role)}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-gray-400" />
                        GIPHY API Key
                      </label>
                      {isEditing ? (
                        <Input
                          value={formData.giphyApiKey}
                          onChange={(e) => setFormData({ ...formData, giphyApiKey: e.target.value })}
                          placeholder="NEXT_PUBLIC_GIPHY_API_KEY"
                          type="password"
                        />
                      ) : (
                        <div className="mt-1 flex items-center text-sm text-gray-600">
                          {formData.giphyApiKey ? '••••••••' : 'Kein API Key gesetzt'}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Wird lokal im Browser gespeichert.</p>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Kontoinformationen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Mitglied seit</label>
                      <div className="mt-1 flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span>{new Date(user.createdAt).toLocaleDateString('de-DE')}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Zuletzt aktualisiert</label>
                      <div className="mt-1 flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span>{new Date(user.updatedAt).toLocaleDateString('de-DE')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Abbrechen
                    </Button>
                    <Button onClick={handleSave}>
                      <Save className="h-4 w-4 mr-2" />
                      Speichern
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Sicherheit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Passwort ändern</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Ändern Sie Ihr Passwort für mehr Sicherheit.
                  </p>
                  <Button variant="outline" size="sm">
                    Passwort ändern
                  </Button>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Zwei-Faktor-Authentifizierung</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Fügen Sie eine zusätzliche Sicherheitsebene hinzu.
                  </p>
                  <Button variant="outline" size="sm">
                    2FA aktivieren
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Einstellungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Benachrichtigungen</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Verwalten Sie Ihre Benachrichtigungseinstellungen.
                  </p>
                  <Button variant="outline" size="sm">
                    Benachrichtigungen
                  </Button>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Datenschutz</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Verwalten Sie Ihre Datenschutzeinstellungen.
                  </p>
                  <Button variant="outline" size="sm">
                    Datenschutz
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}