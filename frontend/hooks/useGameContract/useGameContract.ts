import { useEffect, useMemo, useState } from 'react';
import BN from 'bn.js';
import { useGame } from '../../contexts/GameContext';
import { useBlockHeader, useContractTx, useNotifications } from '../../lib/useInk/hooks';
import { useContractCallDecoded } from '../../lib/useInk/hooks/useContractCallDecoded';
import {
  BoardPosition,
  Dimensions,
  Field,
  Forming,
  GameState,
  Player,
  PlayerColors,
  PlayerList,
  PlayerScore,
  Running,
} from './types';
import { ContractTxFunc } from '../../lib/useInk/types';
import { PLAYER_COLORS } from './data';
import { isBroadcasting, isFinalized, stringNumberToBN } from '../../lib/useInk/utils';
import { useUI } from '../../contexts/UIContext';
import { useAudioSettings } from '../useAudioSettings';
import { useTranslation } from 'react-i18next';
import { useLanguageSettings } from '../useLanguageSettings';
import { stringToHex } from '../../utils';

export const useGameContract = () => useGame().game;

export const useDimensions = (): Dimensions | null => {
  const game = useGameContract();
  const decoded = useContractCallDecoded<Field>(game, 'dimensions');
  if (!decoded || !decoded.ok) return null;

  return { x: parseInt(decoded.value.result.x), y: parseInt(decoded.value.result.y) };
};

const toRunningStatus = (gameState: any, totalRounds: number): Running => {
  const currentRound = stringNumberToBN(gameState.Running.roundsPlayed).toNumber() || 0;
  return {
    status: 'Running',
    totalRounds,
    currentRound,
  };
};

const toFormingStatus = (gameState: any, currentBlock: number): Forming => {
  const earliestStart = stringNumberToBN(gameState.Forming?.earliestStart).toNumber() || 0;
  const startingIn = currentBlock < earliestStart ? earliestStart - currentBlock : 0;

  return {
    status: 'Forming',
    earliestStart,
    startingIn,
  };
};

export const useGameState = (): GameState | null => {
  const game = useGameContract();
  const { blockNumber } = useBlockHeader();
  const currentBlock = blockNumber || 0;
  const [gameState, setGameState] = useState<GameState | null>(null);
  const result = useContractCallDecoded<any>(game, 'state');
  const totalRounds = useContractCallDecoded<any>(game, 'totalRounds');

  const phase = result && result.ok ? Object.keys(result.value.result || {})[0] || '' : '';

  useMemo(() => {
    if (!result || !result.ok || !totalRounds || !totalRounds.ok) return null;

    switch (phase.toLowerCase()) {
      case 'forming':
        setGameState(toFormingStatus(result.value.result, currentBlock));
        break;

      case 'running':
        setGameState(toRunningStatus(result.value.result, totalRounds.value.result));
        break;

      case 'finished':
        setGameState({
          status: 'Finished',
          winner: result.value.result?.[phase].winner,
        });
    }
  }, [phase, currentBlock]);

  return gameState;
};

export const useBuyInAmount = (): BN | null => {
  const game = useGameContract();
  const decoded = useContractCallDecoded<string>(game, 'buyInAmount');

  return useMemo(() => {
    if (decoded && decoded.ok) {
      return stringNumberToBN(decoded.value.result);
    }

    return null;
  }, [decoded]);
};

export const usePlayerColors = (): PlayerColors => {
  const game = useGameContract();
  const decoded = useContractCallDecoded<Player[]>(game, 'playersSorted');
  const playerCount = decoded?.ok ? decoded.value.result.length : 0;

  return useMemo(() => {
    if (decoded && decoded.ok && decoded.value) {
      return decoded.value.result.reduce((acc, p) => {
        const colorIndex = parseInt(stringToHex(p.name), 16) % PLAYER_COLORS.length;
        return { ...acc, [p.id]: PLAYER_COLORS[colorIndex] };
      }, {});
    }

    return [];
  }, [playerCount]);
};

const toNumber = (valWithComma: string): number => parseInt(`${valWithComma?.split(',').join('')}`);

export const usePlayerScores = (): PlayerScore[] => {
  const game = useGameContract();
  const colors = usePlayerColors();
  const result = useContractCallDecoded<Player[]>(game, 'playersSorted');
  const budget = useContractCallDecoded<string>(game, 'gasBudget');

  return useMemo(() => {
    if (result && result.ok && budget && budget.ok) {
      let gas_budget = toNumber(budget.value.result);
      return result.value.result.map((data) => {
        //let gasLeft = gas_budget - data.gasUsed;
        return {
          ...data,
          gasLeft: (gas_budget - toNumber(data.gasUsed)).toLocaleString(),
          score: data.score,
          color: colors[data.id],
        };
      });
    }

    return [];
  }, [result]);
};

export const usePlayers = (): PlayerList => {
  const scores = usePlayerScores();

  return useMemo(() => {
    const p: PlayerList = {};
    for (let i = 0; i < scores.length; i++) {
      const { id, name } = scores[i] || {};
      p[id] = name;
    }
    return p;
  }, [scores]);
};

export const usePlayerName = (): string => {
  const scores = usePlayerScores();
  const { player } = useUI();

  return useMemo(() => {
    const p = scores.find((score) => score.id === player);
    return p ? p.name : '';
  }, [scores]);
};

export const useBoard = (): BoardPosition[] => {
  const game = useGameContract();
  const dim = useDimensions();
  const colors = usePlayerColors();
  const result = useContractCallDecoded<({ owner: string } | null)[]>(game, 'board');

  return useMemo(() => {
    if (dim && result && result.ok) {
      const data: BoardPosition[] = [];

      let index = 0;
      for (let y = 0; y < dim.y; y += 1) {
        for (let x = 0; x < dim.x; x += 1) {
          const owner = result.value.result?.[index]?.owner;
          data.push({ x, y, owner, color: colors[owner || ''] });
          index += 1;
        }
      }

      return data;
    }
    return [];
  }, [dim, result, result?.ok, colors]);
};

export const useSubmitTurnFunc = (): ContractTxFunc => {
  const game = useGameContract();
  const commonTranslation = useTranslation('common');
  const eventTranslation = useTranslation('events');
  const { addNotification } = useNotifications();
  const { sendEffect } = useAudioSettings();
  const submitTurnFunc = useContractTx(game, 'submitTurn', { notificationsOff: true });
  const {
    languageTrack: { locale },
  } = useLanguageSettings();

  const resouces =
    useMemo(() => eventTranslation.i18n.getResourceBundle(locale, 'events'), [locale, eventTranslation]) || {};

  useEffect(() => {
    if (isBroadcasting(submitTurnFunc)) {
      sendEffect?.play();

      const successIndex = Math.floor(Math.random() * (Object.values(resouces?.playerScored).length - 1));
      const message = eventTranslation.t(`turnSubmitted.${successIndex}`);

      addNotification({
        notification: {
          type: 'Broadcast',
          result: submitTurnFunc.result,
          message,
        },
      });
      return;
    }

    if (isFinalized(submitTurnFunc)) {
      addNotification({
        notification: {
          type: 'Finalized',
          result: submitTurnFunc.result,
          message: commonTranslation.t('blockFinalized'),
        },
      });
    }
  }, [submitTurnFunc.status]);

  return submitTurnFunc;
};

export const useRegisterPlayerFunc = () => {
  const game = useGameContract();
  const { t } = useTranslation('common');

  return useContractTx(game, 'registerPlayer', {
    notifications: {
      finalizedMessage: () => t('blockFinalized'),
      inBlockMessage: () => t('inBlock'),
      broadcastMessage: () => t('broadcast'),
      unknownErrorMessage: () => t('somethingWentWrong'),
    },
  });
};
