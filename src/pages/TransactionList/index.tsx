import TransactionListMobile from './TransactionListMobile';
import TransactionListPC from './TransactionListPC';

const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const ExportedComponent = isMobile ? TransactionListMobile : TransactionListPC;
export default ExportedComponent; 