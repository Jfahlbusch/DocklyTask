'use client'

import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react'
import { Team, TeamMember } from '@/lib/types'

interface TeamState {
  teams: Team[]
  teamMembers: TeamMember[]
  loading: boolean
  error: string | null
  lastFetch: number | null
}

type TeamAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TEAMS'; payload: Team[] }
  | { type: 'SET_TEAM_MEMBERS'; payload: TeamMember[] }
  | { type: 'ADD_TEAM'; payload: Team }
  | { type: 'UPDATE_TEAM'; payload: Team }
  | { type: 'DELETE_TEAM'; payload: string }
  | { type: 'ADD_TEAM_MEMBER'; payload: TeamMember }
  | { type: 'UPDATE_TEAM_MEMBER'; payload: TeamMember }
  | { type: 'DELETE_TEAM_MEMBER'; payload: string }

const initialState: TeamState = {
  teams: [],
  teamMembers: [],
  loading: true,
  error: null,
  lastFetch: null,
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

function teamReducer(state: TeamState, action: TeamAction): TeamState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'SET_TEAMS':
      return { ...state, teams: action.payload, loading: false, lastFetch: Date.now() }
    case 'SET_TEAM_MEMBERS':
      return { ...state, teamMembers: action.payload, loading: false, lastFetch: Date.now() }
    case 'ADD_TEAM':
      return { ...state, teams: [...state.teams, action.payload] }
    case 'UPDATE_TEAM':
      return {
        ...state,
        teams: state.teams.map(team =>
          team.id === action.payload.id ? action.payload : team
        ),
      }
    case 'DELETE_TEAM':
      return {
        ...state,
        teams: state.teams.filter(team => team.id !== action.payload),
        teamMembers: state.teamMembers.filter(member => member.teamId !== action.payload),
      }
    case 'ADD_TEAM_MEMBER':
      return { ...state, teamMembers: [...state.teamMembers, action.payload] }
    case 'UPDATE_TEAM_MEMBER':
      return {
        ...state,
        teamMembers: state.teamMembers.map(member =>
          member.id === action.payload.id ? action.payload : member
        ),
      }
    case 'DELETE_TEAM_MEMBER':
      return {
        ...state,
        teamMembers: state.teamMembers.filter(member => member.id !== action.payload),
      }
    default:
      return state
  }
}

interface TeamContextType {
  state: TeamState
  addTeam: (team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateTeam: (id: string, team: Partial<Team>) => Promise<void>
  deleteTeam: (id: string) => Promise<void>
  addTeamMember: (member: Omit<TeamMember, 'id' | 'createdAt'>) => Promise<void>
  updateTeamMember: (id: string, member: Partial<TeamMember>) => Promise<void>
  deleteTeamMember: (id: string) => Promise<void>
  getTeamMembers: (teamId: string) => TeamMember[]
  getUserTeams: (userId: string) => Team[]
  refreshData: () => Promise<void>
}

const TeamContext = createContext<TeamContextType | undefined>(undefined)

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(teamReducer, initialState)

  const fetchData = async (forceRefresh = false) => {
    try {
      // Check if we have cached data and it's still valid
      if (!forceRefresh && state.lastFetch && (Date.now() - state.lastFetch) < CACHE_DURATION) {
        return
      }

      dispatch({ type: 'SET_LOADING', payload: true })
      
      const [teamsRes, membersRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/team-members'),
      ])

      if (!teamsRes.ok) {
        throw new Error('Failed to fetch teams')
      }

      if (!membersRes.ok) {
        throw new Error('Failed to fetch team members')
      }

      const teamsData = await teamsRes.json()
      const membersData = await membersRes.json()

      dispatch({ type: 'SET_TEAMS', payload: teamsData })
      dispatch({ type: 'SET_TEAM_MEMBERS', payload: membersData })
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to fetch team data' 
      })
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const addTeam = async (teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
      })

      if (!response.ok) {
        throw new Error('Failed to create team')
      }

      const newTeam = await response.json()
      dispatch({ type: 'ADD_TEAM', payload: newTeam })
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to add team' 
      })
    }
  }

  const updateTeam = async (id: string, teamData: Partial<Team>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await fetch(`/api/teams/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
      })

      if (!response.ok) {
        throw new Error('Failed to update team')
      }

      const updatedTeam = await response.json()
      dispatch({ type: 'UPDATE_TEAM', payload: updatedTeam })
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to update team' 
      })
    }
  }

  const deleteTeam = async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete team')
      }

      dispatch({ type: 'DELETE_TEAM', payload: id })
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to delete team' 
      })
    }
  }

  const addTeamMember = async (memberData: Omit<TeamMember, 'id' | 'createdAt'>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await fetch('/api/team-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memberData),
      })

      if (!response.ok) {
        throw new Error('Failed to add team member')
      }

      const newMember = await response.json()
      dispatch({ type: 'ADD_TEAM_MEMBER', payload: newMember })
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to add team member' 
      })
    }
  }

  const updateTeamMember = async (id: string, memberData: Partial<TeamMember>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await fetch(`/api/team-members/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memberData),
      })

      if (!response.ok) {
        throw new Error('Failed to update team member')
      }

      const updatedMember = await response.json()
      dispatch({ type: 'UPDATE_TEAM_MEMBER', payload: updatedMember })
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to update team member' 
      })
    }
  }

  const deleteTeamMember = async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await fetch(`/api/team-members/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete team member')
      }

      dispatch({ type: 'DELETE_TEAM_MEMBER', payload: id })
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to delete team member' 
      })
    }
  }

  const getTeamMembers = (teamId: string): TeamMember[] => {
    return state.teamMembers.filter(member => member.teamId === teamId)
  }

  const getUserTeams = (userId: string): Team[] => {
    const memberIds = state.teamMembers
      .filter(member => member.userId === userId)
      .map(member => member.teamId)
    
    return state.teams.filter(team => memberIds.includes(team.id))
  }

  const refreshData = async () => {
    await fetchData(true)
  }

  return (
    <TeamContext.Provider
      value={{
        state,
        addTeam,
        updateTeam,
        deleteTeam,
        addTeamMember,
        updateTeamMember,
        deleteTeamMember,
        getTeamMembers,
        getUserTeams,
        refreshData,
      }}
    >
      {children}
    </TeamContext.Provider>
  )
}

export function useTeamContext() {
  const context = useContext(TeamContext)
  if (context === undefined) {
    throw new Error('useTeamContext must be used within a TeamProvider')
  }
  return context
}