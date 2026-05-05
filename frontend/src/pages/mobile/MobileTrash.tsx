import { useTranslation } from 'react-i18next'
import MobileShell from '../../components/mobile/MobileShell'
import Trash from '../Trash'

export default function MobileTrash() {
  const { t } = useTranslation()
  return (
    <MobileShell title={t('nav.trash')} showBack>
      <Trash />
    </MobileShell>
  )
}
