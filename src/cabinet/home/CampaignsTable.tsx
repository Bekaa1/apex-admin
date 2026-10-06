import { Link } from 'react-router';
import { Icon } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { CABINET_LINKS } from '../sections';
import { CampaignRow } from './CampaignRow';
import type { CampaignItem } from './types';

export function CampaignsTable({ campaigns }: { campaigns: CampaignItem[] }) {
  const { t } = useI18n();
  return (
    <section className="cab-card cab-campaigns" aria-labelledby="campaigns-title">
      <div className="cab-head">
        <div className="cab-head__copy">
          <h2 className="cab-h2" id="campaigns-title">
            {t('home.campaigns.title')}
          </h2>
        </div>
        <div className="cab-head__aside">
          <Link className="cab-link cab-link--more" to={CABINET_LINKS.campaigns}>
            {t('home.campaigns.all')}
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </div>
      <div className="cab-table-wrap">
        <table className="cab-table">
          <thead>
            <tr>
              <th scope="col">{t('home.campaigns.name')}</th>
              <th scope="col">{t('home.campaigns.status')}</th>
              <th scope="col">{t('home.campaigns.budget')}</th>
              <th scope="col" className="cab-table__num">
                {t('home.campaigns.plays')}
              </th>
              <th scope="col">
                <span className="cab-sr">{t('home.campaigns.open')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign, i) => (
              <CampaignRow key={campaign.id} campaign={campaign} index={i} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
