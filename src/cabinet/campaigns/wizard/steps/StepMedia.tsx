import { useId } from 'react';
import { Button, FileDrop, Icon, TextAreaField, TextField } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { IMAGE_ACCEPT, VIDEO_ACCEPT } from '../media';
import type { MediaField } from '../types';
import type { CampaignWizardState } from '../useCampaignWizard';
import { DESCRIPTION_MAX, NAME_MAX } from '../validation';
import { MediaFile } from './MediaFile';

const FIELD = {
  video: { accept: VIDEO_ACCEPT, icon: 'video', title: 'videoDrop', hint: 'videoRules' },
  cover: { accept: IMAGE_ACCEPT, icon: 'image', title: 'coverDrop', hint: 'coverHint' },
} as const;

function MediaInput({ field, wizard }: { field: MediaField; wizard: CampaignWizardState }) {
  const { t } = useI18n();
  const labelId = useId();
  const media = wizard.form[field];
  const error = wizard.errors[field];
  const config = FIELD[field];
  const label = t(`campaigns.wizard.media.${field}`);
  const pick = (file: File) => void wizard.media.pick(field, file);

  return (
    <div className="ax-field">
      <div className="ax-field__top">
        <span className="ax-label" id={labelId}>
          {label}
        </span>
        {field === 'cover' ? <span className="ax-field__optional">{t('campaigns.wizard.media.optional')}</span> : null}
      </div>
      {media.status === 'empty' ? (
        <FileDrop
          accept={config.accept}
          icon={config.icon}
          title={t(`campaigns.wizard.media.${config.title}`)}
          hint={t(`campaigns.wizard.media.${config.hint}`)}
          buttonLabel={t('campaigns.wizard.media.chooseFile')}
          labelledBy={labelId}
          invalid={error === 'required'}
          onFile={pick}
        />
      ) : (
        <MediaFile kind={field} media={media} accept={config.accept} onFile={pick} onRemove={() => wizard.media.remove(field)} />
      )}
      {error === 'required' || error === 'uploading' ? (
        <p className="ax-error">
          <Icon name="alert-circle" size={18} />
          <span>{t(error === 'required' ? 'campaigns.wizard.media.errors.videoRequired' : 'campaigns.wizard.media.errors.uploading')}</span>
        </p>
      ) : null}
      {field === 'video' && media.status !== 'empty' && media.status !== 'failed' ? <p className="ax-hint">{t('campaigns.wizard.media.videoRules')}</p> : null}
    </div>
  );
}

/** Step 1: name, description, video and cover. */
export function StepMedia({ wizard }: { wizard: CampaignWizardState }) {
  const { t } = useI18n();
  const { form, errors, dispatch } = wizard;
  const video = form.video;
  return (
    <div className="cmp-fields">
      <TextField
        label={t('campaigns.wizard.media.name')}
        placeholder={t('campaigns.wizard.media.namePlaceholder')}
        hint={t('campaigns.wizard.media.nameHint')}
        error={errors.name ? t(errors.name === 'tooLong' ? 'campaigns.wizard.media.errors.nameTooLong' : 'campaigns.wizard.media.errors.nameRequired') : undefined}
        value={form.name}
        maxLength={NAME_MAX}
        required
        autoComplete="off"
        onChange={(event) => dispatch({ type: 'name', value: event.target.value })}
      />
      <TextAreaField
        label={t('campaigns.wizard.media.description')}
        optional={t('campaigns.wizard.media.optional')}
        placeholder={t('campaigns.wizard.media.descriptionPlaceholder')}
        hint={t('campaigns.wizard.media.descriptionHint')}
        value={form.description}
        maxLength={DESCRIPTION_MAX}
        showCount
        rows={3}
        onChange={(event) => dispatch({ type: 'description', value: event.target.value })}
      />
      <MediaInput field="video" wizard={wizard} />
      <div className="cmp-cover-field">
        <MediaInput field="cover" wizard={wizard} />
        {video.status === 'ready' && form.cover.status === 'empty' ? (
          <Button variant="ghost" size="md" iconLeft="image" onClick={() => void wizard.media.takeFirstFrame(video.url, video.fileName)}>
            {t('campaigns.wizard.media.firstFrame')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
