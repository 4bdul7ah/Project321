import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';

describe('Home Component', () => {
  beforeEach(() => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
  });

  test('renders the main heading and tagline', () => {
    const mainHeading = screen.getByRole('heading', {
      level: 1,
      name: /TimeSync/i,
    });
    expect(mainHeading).toBeInTheDocument();

    const tagline = screen.getByText(/AI-Powered Scheduling Assistant/i);
    expect(tagline).toBeInTheDocument();
  });

  test('renders the subheading paragraph', () => {
    expect(screen.getByText(/Smart scheduling for students/i)).toBeInTheDocument();
  });

  test('renders "Get Started" and "Create Account" buttons with links', () => {
    expect(screen.getByRole('link', { name: /Get Started/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /Create Account/i })).toHaveAttribute('href', '/signup');
  });

  test('renders the features section', () => {
    expect(screen.getByRole('heading', { level: 2, name: /Why TimeSync/i })).toBeInTheDocument();
    expect(screen.getByText(/AI Scheduling/i)).toBeInTheDocument();
    expect(screen.getByText(/Adaptive Learning/i)).toBeInTheDocument();
    expect(screen.getByText(/Cross-Platform/i)).toBeInTheDocument();
  });

  test('renders the hero image with correct alt text', () => {
    const image = screen.getByAltText(/Time management illustration/i);
    expect(image).toBeInTheDocument();
    expect(image.src).toContain('https://illustrations.popsy.co/amber/digital-nomad.svg');
  });
});
