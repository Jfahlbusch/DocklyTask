'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTeamContext } from '@/hooks/useTeamContext'
import { TeamForm } from '@/components/forms/TeamForm'
import { TeamMemberForm } from '@/components/forms/TeamMemberForm'
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Plus,
  UserPlus,
} from 'lucide-react'
import { Team, TeamMember } from '@/lib/types'

export function TeamList() {
  const { state, deleteTeam, deleteTeamMember, getTeamMembers } = useTeamContext()
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [addingMemberToTeam, setAddingMemberToTeam] = useState<string | null>(null)
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Fetch users separately
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users')
        if (response.ok) {
          const usersData = await response.json()
          setUsers(usersData)
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }
    fetchUsers()
  }, [])

  // Memoize user lookup for performance
  const userMap = useMemo(() => {
    return new Map(users.map(user => [user.id, user]))
  }, [users])

  const getUserById = useCallback((userId: string) => {
    return userMap.get(userId)
  }, [userMap])

  const toggleTeamExpansion = useCallback((teamId: string) => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev)
      if (newSet.has(teamId)) {
        newSet.delete(teamId)
      } else {
        newSet.add(teamId)
      }
      return newSet
    })
  }, [])

  const handleEditTeam = useCallback((team: Team) => {
    setEditingTeam(team)
    setShowTeamForm(true)
  }, [])

  const handleDeleteTeam = useCallback(async (teamId: string) => {
    if (window.confirm('Are you sure you want to delete this team? This will also remove all team memberships.')) {
      await deleteTeam(teamId)
    }
  }, [deleteTeam])

  const handleEditMember = useCallback((member: TeamMember) => {
    setEditingMember(member)
    setShowMemberForm(true)
  }, [])

  const handleDeleteMember = useCallback(async (memberId: string) => {
    if (window.confirm('Are you sure you want to remove this team member?')) {
      await deleteTeamMember(memberId)
    }
  }, [deleteTeamMember])

  const handleAddMember = useCallback((teamId: string) => {
    setAddingMemberToTeam(teamId)
    setShowMemberForm(true)
  }, [])

  const closeForms = useCallback(() => {
    setShowTeamForm(false)
    setShowMemberForm(false)
    setEditingTeam(null)
    setEditingMember(null)
    setAddingMemberToTeam(null)
  }, [])

  if (state.loading) {
    return <div className="flex justify-center p-8">Loading teams...</div>
  }

  if (state.error) {
    return <div className="text-red-500 p-8">Error: {state.error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Teams</h2>
        <Button onClick={() => setShowTeamForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Team
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.teams.map((team) => {
              const members = getTeamMembers(team.id)
              const isExpanded = expandedTeams.has(team.id)
              
              return (
                <React.Fragment key={team.id}>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: team.color }}
                        />
                        <span className="font-medium">{team.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {team.description || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {members.length} members
                        </Badge>
                        {members.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTeamExpansion(team.id)}
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddMember(team.id)}
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTeam(team)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Team
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteTeam(team.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  
                  {/* Team members row - only render when expanded */}
                  {isExpanded && members.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="p-0">
                        <div className="bg-muted/50 p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Users className="w-4 h-4" />
                            <span className="text-sm font-medium">Team Members</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {members.map((member) => {
                              const user = getUserById(member.userId)
                              return (
                                <div
                                  key={member.id}
                                  className="flex items-center justify-between p-2 bg-background rounded border"
                                >
                                  <div className="flex items-center space-x-2">
                                    <Avatar className="w-6 h-6">
                                      <AvatarImage src={user?.avatar} />
                                      <AvatarFallback>
                                        {user?.name?.charAt(0) || user?.email?.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-medium">
                                        {user?.name || user?.email}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {member.role}
                                      </p>
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="w-3 h-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => handleEditMember(member)}
                                      >
                                        <Edit className="w-3 h-3 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteMember(member.id)}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="w-3 h-3 mr-2" />
                                        Remove
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )
            })}
            {state.teams.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <div className="space-y-2">
                    <Users className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">No teams found</p>
                    <Button onClick={() => setShowTeamForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create your first team
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Team Form Dialog */}
      <TeamForm
        open={showTeamForm}
        onOpenChange={(open) => {
          setShowTeamForm(open)
          if (!open) setEditingTeam(null)
        }}
        team={editingTeam || undefined}
        onSuccess={closeForms}
      />

      {/* Team Member Form Dialog */}
      <TeamMemberForm
        open={showMemberForm}
        onOpenChange={(open) => {
          setShowMemberForm(open)
          if (!open) {
            setEditingMember(null)
            setAddingMemberToTeam(null)
          }
        }}
        member={editingMember || undefined}
        teamId={addingMemberToTeam || undefined}
        onSuccess={closeForms}
      />
    </div>
  )
}