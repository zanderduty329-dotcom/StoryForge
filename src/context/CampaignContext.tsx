import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  ensureCampaignCore,
  permissionsForMember,
  writeCampaignCore,
} from "../lib/campaign";

import type {
  CampaignCore,
  CampaignMember,
  CampaignPermissions,
  CampaignRole,
} from "../lib/campaign";


type CampaignContextValue = {
  campaignId: string | null;

  core: CampaignCore | null;

  currentMember:
    CampaignMember | null;

  role:
    CampaignRole | null;

  permissions:
    CampaignPermissions | null;

  isDM: boolean;
  isPlayer: boolean;

  ready: boolean;

  updateCampaignCore: (
    updater: (
      current: CampaignCore
    ) => CampaignCore
  ) => void;
};


const CampaignContext =
  createContext<
    CampaignContextValue |
    null
  >(null);


export function CampaignProvider({
  campaignId,
  children,
}: {
  campaignId: string | null;
  children: ReactNode;
}) {
  const [
    core,
    setCore,
  ] =
    useState<
      CampaignCore | null
    >(null);

  const [
    ready,
    setReady,
  ] =
    useState(false);


  useEffect(() => {
    if (!campaignId) {
      setCore(null);
      setReady(true);
      return;
    }

    setReady(false);

    /*
     * STORYFORGE CAMPAIGN RUNTIME V1
     *
     * Opening any existing world automatically
     * gives it Campaign Core data without changing
     * the world's existing ID or page storage.
     */
    const next =
      ensureCampaignCore(
        campaignId
      );

    setCore(next);
    setReady(true);
  }, [campaignId]);


  /*
   * During local V1 development StoryForge opens
   * the campaign from the DM side.
   *
   * Later the authenticated campaign member will
   * determine this instead.
   */
  const currentMember =
    useMemo(() => {
      if (!core) {
        return null;
      }

      return (
        core.members.find(
          (member) =>
            member.id ===
            "local-dm"
        ) ??
        core.members.find(
          (member) =>
            member.role ===
            "dm"
        ) ??
        core.members[0] ??
        null
      );
    }, [core]);


  const permissions =
    useMemo(() => {
      if (
        !core ||
        !currentMember
      ) {
        return null;
      }

      return permissionsForMember(
        core,
        currentMember
      );
    }, [
      core,
      currentMember,
    ]);


  const updateCampaignCore =
    useCallback(
      (
        updater: (
          current:
            CampaignCore
        ) => CampaignCore
      ) => {
        setCore(
          (current) => {
            if (!current) {
              return current;
            }

            const updated =
              updater(current);

            const normalized: CampaignCore =
              {
                ...updated,

                campaignId:
                  current.campaignId,

                version: 1,

                updatedAt:
                  new Date()
                    .toISOString(),
              };

            writeCampaignCore(
              normalized
            );

            return normalized;
          }
        );
      },
      []
    );


  const value =
    useMemo<
      CampaignContextValue
    >(
      () => ({
        campaignId,
        core,
        currentMember,

        role:
          currentMember?.role ??
          null,

        permissions,

        isDM:
          currentMember?.role ===
          "dm",

        isPlayer:
          currentMember?.role ===
          "player",

        ready,

        updateCampaignCore,
      }),
      [
        campaignId,
        core,
        currentMember,
        permissions,
        ready,
        updateCampaignCore,
      ]
    );


  return (
    <CampaignContext.Provider
      value={value}
    >
      {children}
    </CampaignContext.Provider>
  );
}


export function useCampaign() {
  const context =
    useContext(
      CampaignContext
    );

  if (!context) {
    throw new Error(
      "useCampaign must be used inside CampaignProvider."
    );
  }

  return context;
}
