import { FileText } from 'lucide-react-native';
import Screen from '../../../screens/Requests';
import { withExecutiveTab } from '../../../components/executive/ExecutiveTabScreen';
import ExecutiveHeader from '../../../components/executive/ExecutiveHeader';

export default withExecutiveTab(Screen, {
  header: <ExecutiveHeader variant="white" icon={FileText} title="Measurement Requests" subtitle="Manage your assigned tasks" />,
});
