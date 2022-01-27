import { 
  DashboardOutlined,
  IdcardOutlined,
  TeamOutlined,
  SolutionOutlined,
  SubnodeOutlined,
  HomeOutlined

} from '@ant-design/icons';
import { APP_PREFIX_PATH } from 'configs/AppConfig'

const mainNavTree = [{
  key: 'home',
  path: `${APP_PREFIX_PATH}/home`,
  title: 'home',
  icon: HomeOutlined,
  breadcrumb: false,
  submenu: []
},
{
  key: 'memberships',
  path: `${APP_PREFIX_PATH}/memberships`,
  title: 'Memberships',
  icon: DashboardOutlined,
  breadcrumb: false,
  submenu: []
},
{
  key: 'cards',
  path: `${APP_PREFIX_PATH}/cards`,
  title: 'Cards',
  icon: IdcardOutlined,
  breadcrumb: false,
  submenu: []
},
{
  key: 'joinleague',
  path: `${APP_PREFIX_PATH}/joinleague`,
  title: 'Join a League',
  icon: DashboardOutlined,
  breadcrumb: false,
  submenu: []
},
{
  key: 'leagueadmin',
  path: `${APP_PREFIX_PATH}/admin`,
  title: 'League Admin',
  icon: DashboardOutlined,
  breadcrumb: false,
  submenu: [
    {
      key: 'adminleagues',
      path: `${APP_PREFIX_PATH}/admin/leagues`,
      title: 'Leagues',
      icon: SolutionOutlined,
      breadcrumb: false,
      submenu: []
    },
    {
      key: 'adminprograms',
      path: `${APP_PREFIX_PATH}/admin/programs`,
      title: 'Programs',
      icon: SubnodeOutlined,
      breadcrumb: false,
      submenu: []
    },
    {
      key: 'adminmemberships',
      path: `${APP_PREFIX_PATH}/admin/memberships`,
      title: 'Memberships',
      icon: SubnodeOutlined,
      breadcrumb: false,
      submenu: []
    },
    {
      key: 'adminplayers',
      path: `${APP_PREFIX_PATH}/admin/players`,
      title: 'Players',
      icon: TeamOutlined,
      breadcrumb: false,
      submenu: []
    }
  ]
}
]


const topNavTree = [
  {
    key: 'extra-pages-setting',
    path: `${APP_PREFIX_PATH}/pages/setting`,
    // title: 'sidenav.pages.setting',
    title: 'Account Settings',
    icon: '',
    breadcrumb: true,
    submenu: []
  }
]

const navigationConfig = [
  ...mainNavTree,
  // ...topNavTree
]

export default navigationConfig;
