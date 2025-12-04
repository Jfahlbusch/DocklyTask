'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Shield, Users, LayoutList, KanbanSquare, CheckSquare, Square } from 'lucide-react';
import TaskInternalChat from './TaskInternalChat';

interface TestUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';
  avatar?: string;
}

interface TestTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
}

const testUsers: TestUser[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@taskwise.de',
    role: 'ADMIN',
    avatar: undefined,
  },
  {
    id: '2',
    name: 'Manager User',
    email: 'manager@taskwise.de',
    role: 'MANAGER',
    avatar: undefined,
  },
  {
    id: '3',
    name: 'Regular User',
    email: 'user@taskwise.de',
    role: 'USER',
    avatar: undefined,
  },
  {
    id: '4',
    name: 'Viewer User',
    email: 'viewer@taskwise.de',
    role: 'VIEWER',
    avatar: undefined,
  },
];

const testTasks: TestTask[] = [
  {
    id: 'task-1',
    title: 'Website Redesign',
    description: 'Neues Design für die Unternehmenswebsite erstellen',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
  },
  {
    id: 'task-2',
    title: 'Datenbank Migration',
    description: 'Alte Datenbank auf neues System migrieren',
    status: 'PENDING',
    priority: 'MEDIUM',
  },
];

export default function RoleTestDemo() {
  const [currentUser, setCurrentUser] = useState<TestUser>(testUsers[0]);
  const [selectedTask, setSelectedTask] = useState<TestTask>(testTasks[0]);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'USER':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canSeeInternalChat = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Aufgabenbezogener Interner Chat Demo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              Diese Demo zeigt, wie der interne Chat pro Aufgabe funktioniert und nur für Admins und Manager sichtbar ist.
            </p>
            
            {/* User Selection */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Aktuellen Benutzer auswählen:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {testUsers.map((user) => (
                  <Button
                    key={user.id}
                    variant={currentUser.id === user.id ? "default" : "outline"}
                    className="flex flex-col items-center gap-2 h-auto p-4"
                    onClick={() => setCurrentUser(user)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <div className="font-medium">{user.name}</div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs mt-1 ${getRoleBadgeColor(user.role)}`}
                      >
                        {user.role}
                      </Badge>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Current User Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  <AvatarFallback>
                    {currentUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{currentUser.name}</div>
                  <div className="text-sm text-gray-600">{currentUser.email}</div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs mt-1 ${getRoleBadgeColor(currentUser.role)}`}
                  >
                    {currentUser.role}
                  </Badge>
                </div>
              </div>
              <div className="mt-3">
                <Badge 
                  variant={canSeeInternalChat ? "default" : "secondary"}
                  className="text-sm"
                >
                  {canSeeInternalChat ? (
                    <>
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Kann internen Chat sehen
                    </>
                  ) : (
                    <>
                      <Shield className="h-3 w-3 mr-1" />
                      Kein Zugriff auf internen Chat
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Aufgabe auswählen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testTasks.map((task) => (
              <Card 
                key={task.id}
                className={`cursor-pointer transition-colors ${
                  selectedTask.id === task.id ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedTask(task)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {task.status === 'COMPLETED' ? (
                        <CheckSquare className="h-5 w-5 text-green-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{task.status}</Badge>
                        <Badge className={
                          task.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                          task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task with Internal Chat */}
      <Card>
        <CardHeader>
          <CardTitle>
            Aufgabe: {selectedTask.title}
            {canSeeInternalChat && (
              <Badge variant="outline" className="ml-2">
                <MessageSquare className="h-3 w-3 mr-1" />
                Interner Chat verfügbar
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">{selectedTask.description}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{selectedTask.status}</Badge>
                <Badge className={
                  selectedTask.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                  selectedTask.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }>
                  {selectedTask.priority}
                </Badge>
              </div>
            </div>

            {/* Internal Chat Component */}
            <TaskInternalChat 
              taskId={selectedTask.id}
              taskTitle={selectedTask.title}
            />

            {!canSeeInternalChat && (
              <div className="bg-gray-100 border border-gray-200 rounded-lg p-6 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Kein Zugriff auf internen Chat
                </h3>
                <p className="text-sm text-gray-500">
                  Als {currentUser.role} haben Sie keine Berechtigung, den internen Chat zu sehen.
                  Der interne Chat ist nur für Admins und Manager sichtbar.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>Wie es funktioniert</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>Technische Umsetzung:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Der <code>TaskInternalChat</code>-Komponente ist pro Aufgabe integriert</li>
              <li>Die Komponente prüft intern mit <code>useUserPermissions</code> die Berechtigungen</li>
              <li>Admins und Manager sehen den Chat-Bereich in jeder Aufgabe</li>
              <li>Reguläre Benutzer und Viewer sehen den Chat nicht</li>
              <li>Chat-Nachrichten sind aufgabenbezogen und nicht global</li>
            </ul>
            
            <p className="pt-2">
              <strong>Vorteile des aufgabenbezogenen Chats:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>✅ <strong>Kontextbezogen:</strong> Diskussionen bleiben bei der entsprechenden Aufgabe</li>
              <li>✅ <strong>Übersichtlich:</strong> Keine Vermischung von verschiedenen Aufgaben</li>
              <li>✅ <strong>Sicher:</strong> Interne Kommunikation ist geschützt</li>
              <li>✅ <strong>Effizient:</strong> Direkte Kommunikation zur Aufgabe</li>
            </ul>
            
            <p className="pt-2">
              <strong>Sichtbarkeit:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>✅ <strong>Admin:</strong> Sieht und kann den internen Chat in jeder Aufgabe nutzen</li>
              <li>✅ <strong>Manager:</strong> Sieht und kann den internen Chat in jeder Aufgabe nutzen</li>
              <li>❌ <strong>User:</strong> Sieht nur die Aufgabe, aber keinen internen Chat</li>
              <li>❌ <strong>Viewer:</strong> Sieht nur die Aufgabe, aber keinen internen Chat</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}