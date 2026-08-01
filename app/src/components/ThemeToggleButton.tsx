import { IconButton, Tooltip } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useColorMode } from '../theme/ColorModeContext';

type Props = {
  edge?: 'start' | 'end' | false;
  size?: 'small' | 'medium' | 'large';
};

export function ThemeToggleButton({ edge = false, size = 'medium' }: Props) {
  const { mode, toggleColorMode } = useColorMode();
  const next = mode === 'light' ? 'dark' : 'light';

  return (
    <Tooltip title={`Switch to ${next} mode`}>
      <IconButton
        onClick={toggleColorMode}
        color="inherit"
        edge={edge}
        size={size}
        aria-label={`Switch to ${next} mode`}
      >
        {mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
      </IconButton>
    </Tooltip>
  );
}
