import Screen from '../../../screens/Wallet';
import { withExecutiveTab } from '../../../components/executive/ExecutiveTabScreen';
import ExecutiveHeader from '../../../components/executive/ExecutiveHeader';

export default withExecutiveTab(Screen, { header: <ExecutiveHeader title="Wallet" back={false} /> });
