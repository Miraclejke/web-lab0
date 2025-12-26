import { FC, useState } from 'react';
import {
  Panel,
  PanelHeader,
  Header,
  Button,
  Group,
  Cell,
  Div,
  Avatar,
  NavIdProps,
} from '@vkontakte/vkui';
import bridge, { UserInfo } from '@vkontakte/vk-bridge';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { buildRandomStoryPayload } from '../utils';

export interface HomeProps extends NavIdProps {
  fetchedUser?: UserInfo;
}

export const Home: FC<HomeProps> = ({ id, fetchedUser }) => {
  const { photo_200, city, first_name, last_name } = { ...fetchedUser };
  const routeNavigator = useRouteNavigator();
  const [isStoryLoading, setStoryLoading] = useState(false);

  const handleOpenStory = async () => {
    if (isStoryLoading) {
      return;
    }

    setStoryLoading(true);
    try {
      const payload = await buildRandomStoryPayload();
      await bridge.send('VKWebAppShowStoryBox', payload);
    } catch {
      await bridge.send('VKWebAppShowAlert', {
        message: 'Unable to open the story editor right now. Please try again.',
      });
    } finally {
      setStoryLoading(false);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader>Главная</PanelHeader>
      {fetchedUser && (
        <Group header={<Header size="s">User Data Fetched with VK Bridge</Header>}>
          <Cell before={photo_200 && <Avatar src={photo_200} />} subtitle={city?.title}>
            {`${first_name} ${last_name}`}
          </Cell>
        </Group>
      )}

      <Group header={<Header size="s">Navigation Example</Header>}>
        <Div>
          <Button stretched size="l" mode="secondary" onClick={() => routeNavigator.push('persik')}>
            Покажите Персика, пожалуйста!
          </Button>
        </Div>
      </Group>
      <Group header={<Header size="s">Stories</Header>}>
        <Div>
          <Button
            stretched
            size="l"
            mode="primary"
            loading={isStoryLoading}
            onClick={handleOpenStory}
          >
            Open random story
          </Button>
        </Div>
      </Group>
    </Panel>
  );
};
