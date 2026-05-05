import { useTranslation } from 'react-i18next'
import MobileShell from '../../components/mobile/MobileShell'
import Settings from '../Settings'

export default function MobileSettings() {
  const { t } = useTranslation()
  return (
    <MobileShell title={t('common.settings')}>
      <Settings />
    </MobileShell>
  )
}
