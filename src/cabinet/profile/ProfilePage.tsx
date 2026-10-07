import { useState, type FormEvent } from 'react';
import { Alert, Button, OtpInput, Skeleton, TextField } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { normalizeKazakhstanPhone, validateEmail } from '../../auth/validation';
import { useAuthSession } from '../../auth/useAuthSession';
import { useProfileActions, useProfileQuery } from './useProfile';
import type { ContactChannel, Profile } from './api';
import styles from './ProfilePage.module.css';

type ContactFlow =
  | { channel: 'email'; step: 'edit'; value: string; currentEmail: string | undefined }
  | {
      channel: 'email';
      step: 'verify';
      value: string;
      currentEmail: string | undefined;
      currentToken: string;
      newToken: string;
      currentConfirmed: boolean;
    }
  | { channel: 'phone'; step: 'edit'; value: string }
  | { channel: 'phone'; step: 'verify'; value: string; token: string }
  | null;

function authErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}

function ProfileLoading() {
  return (
    <div className={styles.loading} aria-busy="true">
      <Skeleton width="42%" height={28} />
      <Skeleton width="100%" height={210} />
      <Skeleton width="100%" height={250} />
    </div>
  );
}

function ProfileEditor({ profile, userId, email, phone }: {
  profile: Profile;
  userId: string;
  email: string | undefined;
  phone: string | undefined;
}) {
  const { t } = useI18n();
  const { save, requestChange, resendCode, verifyChange } = useProfileActions(userId);
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [companyName, setCompanyName] = useState(profile.company_name ?? '');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [flow, setFlow] = useState<ContactFlow>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSaved, setContactSaved] = useState(false);
  const contactBusy = requestChange.isPending || resendCode.isPending || verifyChange.isPending;

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    setProfileSaved(false);

    const name = fullName.trim();
    const company = companyName.trim();
    if (!name || !company || !profile.bin?.trim()) {
      setProfileError(t('profile.errors.profileRequired'));
      return;
    }

    try {
      await save.mutateAsync({ fullName: name, bin: profile.bin, companyName: company });
      setProfileSaved(true);
    } catch {
      setProfileError(t('profile.errors.save'));
    }
  }

  function startContactChange(channel: ContactChannel, currentValue: string | undefined) {
    if (contactBusy) return;
    requestChange.reset();
    resendCode.reset();
    verifyChange.reset();
    setContactError(null);
    setContactSaved(false);
    setFlow(channel === 'email'
      ? { channel, step: 'edit', value: currentValue ?? '', currentEmail: currentValue }
      : { channel, step: 'edit', value: currentValue ?? '' });
  }

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!flow || flow.step !== 'edit' || contactBusy) return;
    setContactError(null);
    setContactSaved(false);

    let value = flow.value.trim();
    if (flow.channel === 'email') {
      if (validateEmail(value)) {
        setContactError(t('profile.errors.emailFormat'));
        return;
      }
    } else {
      const normalized = normalizeKazakhstanPhone(value);
      if (!normalized) {
        setContactError(t('profile.errors.phoneFormat'));
        return;
      }
      value = normalized;
    }

    const currentValue = flow.channel === 'email' ? email : phone;
    const unchanged = flow.channel === 'email'
      ? value.toLowerCase() === currentValue?.toLowerCase()
      : normalizeKazakhstanPhone(currentValue ?? '') === value;
    if (unchanged) {
      setContactError(t('profile.errors.contactSame'));
      return;
    }

    try {
      await requestChange.mutateAsync({ channel: flow.channel, value });
      setFlow(flow.channel === 'email'
        ? {
            channel: 'email',
            step: 'verify',
            value,
            currentEmail: flow.currentEmail,
            currentToken: '',
            newToken: '',
            currentConfirmed: !flow.currentEmail,
          }
        : { channel: 'phone', step: 'verify', value, token: '' });
    } catch (error) {
      const code = authErrorCode(error);
      const contactInUseKey = code === 'email_exists'
        ? 'profile.errors.emailInUse'
        : code === 'phone_exists'
          ? 'profile.errors.phoneInUse'
          : null;
      setContactError(contactInUseKey ? t(contactInUseKey) : t('profile.errors.sendCode'));
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!flow || flow.step !== 'verify' || contactBusy) return;
    setContactError(null);
    resendCode.reset();

    try {
      if (flow.channel === 'email' && flow.currentEmail && !flow.currentConfirmed) {
        if (!/^\d{6}$/.test(flow.currentToken)) {
          setContactError(t('profile.errors.codeFormat'));
          return;
        }
        await verifyChange.mutateAsync({ channel: 'email', value: flow.currentEmail, token: flow.currentToken });
        setFlow({ ...flow, currentToken: '', currentConfirmed: true });
        return;
      }

      const token = flow.channel === 'email' ? flow.newToken : flow.token;
      if (!/^\d{6}$/.test(token)) {
        setContactError(t('profile.errors.codeFormat'));
        return;
      }

      await verifyChange.mutateAsync({ channel: flow.channel, value: flow.value, token });
      setFlow(null);
      setContactSaved(true);
    } catch {
      setContactError(t('profile.errors.verifyCode'));
    }
  }

  async function handleResend() {
    if (!flow || flow.step !== 'verify' || contactBusy) return;
    setContactError(null);
    try {
      await resendCode.mutateAsync({ channel: flow.channel, value: flow.value });
      setFlow(flow.channel === 'email'
        ? { ...flow, currentToken: '', newToken: '', currentConfirmed: !flow.currentEmail }
        : { ...flow, token: '' });
    } catch {
      setContactError(t('profile.errors.resendCode'));
    }
  }

  function renderContactForm(channel: ContactChannel) {
    if (flow?.channel !== channel) return null;

    if (flow.step === 'edit') {
      const isEmail = channel === 'email';
      return (
        <form className={styles.contactForm} onSubmit={sendCode}>
          <TextField
            label={t(isEmail ? 'profile.fields.email' : 'profile.fields.phone')}
            type={isEmail ? 'email' : 'tel'}
            inputMode={isEmail ? 'email' : 'tel'}
            autoComplete={isEmail ? 'email' : 'tel'}
            placeholder={isEmail ? 'name@example.com' : '+7 777 000 00 00'}
            value={flow.value}
            onChange={(event) => {
              setContactError(null);
              setFlow({ ...flow, value: event.currentTarget.value });
            }}
            disabled={contactBusy}
            required
          />
          {contactError ? <Alert tone="danger">{contactError}</Alert> : null}
          <div className={styles.actions}>
            <Button type="submit" size="md" loading={requestChange.isPending}>
              {t('profile.actions.sendCode')}
            </Button>
            <Button type="button" variant="secondary" size="md" disabled={contactBusy} onClick={() => setFlow(null)}>
              {t('profile.actions.cancel')}
            </Button>
          </div>
        </form>
      );
    }

    return (
      <form className={styles.contactForm} onSubmit={verifyCode}>
        {flow.channel === 'email' && flow.currentEmail ? (
          <p className={styles.codeHint}>{t('profile.otpSentBoth', { current: flow.currentEmail, next: flow.value })}</p>
        ) : (
          <p className={styles.codeHint}>{t('profile.otpSent', { contact: flow.value })}</p>
        )}
        {flow.channel === 'email' && flow.currentEmail && !flow.currentConfirmed ? (
          <>
            <OtpInput
              label={t('profile.fields.currentEmailCode', { email: flow.currentEmail })}
              value={flow.currentToken}
              onChange={(currentToken) => {
                setContactError(null);
                setFlow({ ...flow, currentToken });
              }}
              autoFocus
              disabled={contactBusy}
            />
            <Button type="submit" size="md" loading={verifyChange.isPending} disabled={contactBusy}>
              {t('profile.actions.confirmCurrentEmail')}
            </Button>
          </>
        ) : (
          <>
            {flow.channel === 'email' && flow.currentEmail ? (
              <Alert tone="success">{t('profile.currentEmailConfirmed')}</Alert>
            ) : null}
            <OtpInput
              label={flow.channel === 'email'
                ? t('profile.fields.newEmailCode', { email: flow.value })
                : t('profile.fields.code')}
              value={flow.channel === 'email' ? flow.newToken : flow.token}
              onChange={(token) => {
                setContactError(null);
                setFlow(flow.channel === 'email' ? { ...flow, newToken: token } : { ...flow, token });
              }}
              autoFocus
              disabled={contactBusy}
            />
            <Button type="submit" size="md" loading={verifyChange.isPending} disabled={contactBusy}>
              {t(flow.channel === 'email' ? 'profile.actions.confirmNewEmail' : 'profile.actions.confirm')}
            </Button>
          </>
        )}
        {contactError ? <Alert tone="danger">{contactError}</Alert> : null}
        {resendCode.isSuccess ? (
          <Alert tone="success">
            {t(flow.channel === 'email' && flow.currentEmail ? 'profile.codesResent' : 'profile.codeResent')}
          </Alert>
        ) : null}
        <div className={styles.actions}>
          <Button type="button" variant="secondary" size="md" loading={resendCode.isPending} disabled={contactBusy} onClick={handleResend}>
            {t(flow.channel === 'email' && flow.currentEmail ? 'profile.actions.resendBothCodes' : 'profile.actions.resendCode')}
          </Button>
          <Button type="button" variant="ghost" size="md" disabled={contactBusy} onClick={() => setFlow(null)}>
            {t('profile.actions.cancel')}
          </Button>
        </div>
      </form>
    );
  }

  function renderContactCard(channel: ContactChannel, value: string | undefined) {
    const isEmail = channel === 'email';
    const active = flow?.channel === channel;
    return (
      <div className={styles.contactCard}>
        <div className={styles.contactHeader}>
          <div>
            <h3 className={styles.cardTitle}>{t(isEmail ? 'profile.fields.email' : 'profile.fields.phone')}</h3>
            <p className={styles.contactValue}>{value || t('profile.notSet')}</p>
          </div>
          {!active ? (
            <Button
              variant="secondary"
              size="md"
              disabled={contactBusy}
              onClick={() => startContactChange(channel, value)}
            >
              {t(value ? 'profile.actions.change' : 'profile.actions.add')}
            </Button>
          ) : null}
        </div>
        {renderContactForm(channel)}
      </div>
    );
  }

  return (
    <div className={styles.sections}>
      <section className={styles.card} aria-labelledby="profile-personal-title">
        <div className={styles.cardHeading}>
          <h2 className={styles.cardTitle} id="profile-personal-title">{t('profile.personalTitle')}</h2>
          <p className={styles.description}>{t('profile.personalDescription')}</p>
        </div>
        <form className={styles.profileForm} onSubmit={handleProfileSubmit}>
          <div className={styles.fields}>
            <TextField
              label={t('profile.fields.fullName')}
              autoComplete="name"
              maxLength={160}
              value={fullName}
              onChange={(event) => {
                setProfileSaved(false);
                setFullName(event.currentTarget.value);
              }}
              required
            />
            <TextField
              label={t('profile.fields.companyName')}
              autoComplete="organization"
              maxLength={200}
              value={companyName}
              onChange={(event) => {
                setProfileSaved(false);
                setCompanyName(event.currentTarget.value);
              }}
              required
            />
          </div>
          {profileError ? <Alert tone="danger">{profileError}</Alert> : null}
          {profileSaved ? <Alert tone="success">{t('profile.profileSaved')}</Alert> : null}
          <div className={styles.actions}>
            <Button type="submit" size="md" loading={save.isPending}>
              {t('profile.actions.save')}
            </Button>
          </div>
        </form>
      </section>

      <section className={styles.card} aria-labelledby="profile-login-title">
        <div className={styles.cardHeading}>
          <h2 className={styles.cardTitle} id="profile-login-title">{t('profile.loginTitle')}</h2>
          <p className={styles.description}>{t('profile.loginDescription')}</p>
        </div>
        <div className={styles.contacts}>
          {renderContactCard('email', email)}
          {renderContactCard('phone', phone)}
        </div>
        {contactError && flow === null ? <Alert tone="danger">{contactError}</Alert> : null}
        {contactSaved ? <Alert tone="success">{t('profile.contactSaved')}</Alert> : null}
      </section>
    </div>
  );
}

export function ProfilePage() {
  const { t } = useI18n();
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const profile = useProfileQuery(userId);

  if (profile.isPending) return <ProfileLoading />;
  if (profile.isError || !profile.data || !userId) {
    return <Alert tone="danger" title={t('profile.errors.loadTitle')}>{t('profile.errors.load')}</Alert>;
  }

  return (
    <div className={styles.page}>
      <p className={styles.intro}>{t('profile.intro')}</p>
      <ProfileEditor
        key={userId}
        profile={profile.data}
        userId={userId}
        email={session.user.email}
        phone={session.user.phone}
      />
    </div>
  );
}
