import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>{children}</a>
  ),
}))

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInWithMicrosoft: vi.fn(),
    signInWithFacebook: vi.fn(),
  }),
}))

// Mock database and webhooks modules
vi.mock('../../lib/database', () => ({
  createUserWorkspaceAndProfile: vi.fn().mockResolvedValue({
    workspace: { id: 'ws-1' },
    businessProfile: { id: 'bp-1' },
  }),
}))

vi.mock('../../lib/webhooks', () => ({
  createAgentAndKnowledgeBase: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../lib/locations', () => ({
  LocationService: {
    create: vi.fn().mockResolvedValue({ id: 'loc-1' }),
  },
}))

// Mock framer-motion to render children without animation
vi.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: new Proxy(
      {},
      {
        get: (_target: unknown, prop: string) => {
          return React.forwardRef(
            ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }, ref: React.Ref<HTMLElement>) => {
              // Filter out framer-motion-specific props
              const filteredProps: Record<string, unknown> = {}
              for (const [key, value] of Object.entries(props)) {
                if (
                  !['initial', 'animate', 'exit', 'variants', 'transition',
                    'whileHover', 'whileTap', 'whileInView', 'layout'].includes(key)
                ) {
                  filteredProps[key] = value
                }
              }
              return React.createElement(prop, { ...filteredProps, ref }, children)
            }
          )
        },
      }
    ),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  }
})

import Setup from '../Setup'

describe('Setup page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders step 1 - Personal Profile', () => {
    render(<Setup />)
    expect(screen.getByText('Tell us about yourself')).toBeInTheDocument()
    expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Work Email/)).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 3: Personal Profile')).toBeInTheDocument()
  })

  it('has the Next button disabled when required fields are empty', () => {
    render(<Setup />)
    const nextButton = screen.getByRole('button', { name: /next/i })
    expect(nextButton).toBeDisabled()
  })

  // Flaky under full-suite load: render+userEvent occasionally exceeds the
  // default 5s ceiling when CPU contention is high. Bump to 15s — the test
  // passes deterministically in isolation (~600ms) so 15s is generous.
  it('keeps Next disabled when only one personal field is filled', { timeout: 15000 }, async () => {
    const user = userEvent.setup()
    render(<Setup />)

    // Fill in full name only — Country (Radix Select) is required and not filled.
    const fullNameInput = screen.getByLabelText(/Full Name/)
    await user.type(fullNameInput, 'Test User')

    const nextButton = screen.getByRole('button', { name: /next/i })
    expect(nextButton).toBeDisabled()
  })

  it('has Back button disabled on step 1', () => {
    render(<Setup />)
    const backButton = screen.getByRole('button', { name: /back/i })
    expect(backButton).toBeDisabled()
  })

  it('renders the logo with a link to home', () => {
    render(<Setup />)
    const logo = screen.getByAltText('Boltcall')
    expect(logo).toBeInTheDocument()
    expect(logo.closest('a')).toHaveAttribute('href', '/')
  })

  it('displays the step indicator text', () => {
    render(<Setup />)
    expect(screen.getByText(/Step 1 of 3/)).toBeInTheDocument()
  })
})
