import Screen from '../../../screens/Profile';
import { withExecutiveTab } from '../../../components/executive/ExecutiveTabScreen';
import ExecutiveHeader from '../../../components/executive/ExecutiveHeader';

export default withExecutiveTab(Screen, { header: <ExecutiveHeader title="Profile Settings" back={false} /> });
