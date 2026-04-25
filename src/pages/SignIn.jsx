import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setSession } from '@/lib/sqhnSession';
import { verifyMentorAccess } from '@/functions/verifyMentorAccess';
import { verifyTraineeAccess } from '@/functions/verifyTraineeAccess';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Loader2 } from 'lucide-react';

export default function SignIn() {
  const navigate = useNavigate();
  const [role, setRole] = useState('mentor');
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (role === 'mentor') {
        const res = await verifyMentorAccess({ email, access_code: accessCode });
        setSession({
          role: 'mentor',
          email: res.data.email,
          name: res.data.name,
        });
        navigate('/dashboard');
      } else {
        const res = await verifyTraineeAccess({ email, access_code: accessCode });
        setSession({
          role: 'trainee',
          email: res.data.email,
          name: res.data.name,
          assignment_id: res.data.assignment_id,
          mentor_email: res.data.assigned_mentor_email,
        });
        navigate('/standards');
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Invalid credentials. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="bg-primary pt-16 pb-12 px-6 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SQHN MAT</h1>
        </div>
        <p className="text-primary-foreground/70 text-sm font-medium">
          Mentored Assessment Tool
        </p>
      </div>

      {/* Form Card */}
      <div className="flex-1 -mt-4 rounded-t-2xl bg-background px-6 pt-8">
        {/* Role Toggle */}
        <div className="flex bg-muted rounded-xl p-1 mb-8 max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => { setRole('mentor'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              role === 'mentor'
                ? 'bg-white text-primary shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            Mentor
          </button>
          <button
            type="button"
            onClick={() => { setRole('trainee'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              role === 'trainee'
                ? 'bg-white text-primary shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            Trainee Surveyor
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 max-w-sm mx-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 text-base rounded-xl bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Access Code
            </label>
            <Input
              type="password"
              placeholder="Enter your access code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              required
              className="h-12 text-base rounded-xl bg-white"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Sign In'
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-2">
            {role === 'mentor'
              ? 'Use your QualCrest credentials to sign in'
              : 'Use your programme access code to sign in'
            }
          </p>
        </form>
      </div>
    </div>
  );
}