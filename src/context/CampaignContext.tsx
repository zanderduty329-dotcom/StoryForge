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
  addCampaignPlayer,
  ensureCampaignCore,
  linkMemberCharacter,
  permissionsForMember,
  readActiveCampaignMemberId,
  removeCampaignMember,
  renameCampaignMember,
  updateMemberPermissions,
  writeActiveCampaignMemberId,
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

  /*
   * STORYFORGE CAMPAIGN MEMBERSHIP RUNTIME V1
   */
  setActiveMember: (
    memberId: string
  ) => void;

  addPlayer: (
    displayName: string,
    characterId?: string
  ) => void;

  removePlayer: (
    memberId: string
  ) => void;

  renameMember: (
    memberId: string,
    displayName: string
  ) => void;

  linkPlayerCharacter: (
    memberId: string,
    characterId?: string
  ) => void;

  setMemberPermissions: (
    memberId: string,
    overrides:
      Partial<CampaignPermissions>
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

  const [
    activeMemberId,
    setActiveMemberId,
  ] =
    useState<string | null>(
      null
    );


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

    const savedMemberId =
      readActiveCampaignMemberId(
        campaignId
      );

    const validSavedMember =
      savedMemberId &&
      next.members.some(
        (member) =>
          member.id ===
          savedMemberId
      );

    const nextMemberId =
      validSavedMember
        ? savedMemberId
        : (
            next.members.find(
              (member) =>
                member.id ===
                "local-dm"
            ) ??
            next.members.find(
              (member) =>
                member.role ===
                "dm"
            ) ??
            next.members[0]
          )?.id ??
          null;

    setActiveMemberId(
      nextMemberId
    );

    if (nextMemberId) {
      writeActiveCampaignMemberId(
        campaignId,
        nextMemberId
      );
    }

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

      if (activeMemberId) {
        const selected =
          core.members.find(
            (member) =>
              member.id ===
              activeMemberId
          );

        if (selected) {
          return selected;
        }
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
    }, [
      core,
      activeMemberId,
    ]);


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


  const setActiveMember =
    useCallback(
      (memberId: string) => {
        if (
          !core ||
          !campaignId
        ) {
          return;
        }

        const exists =
          core.members.some(
            (member) =>
              member.id ===
              memberId
          );

        if (!exists) {
          return;
        }

        setActiveMemberId(
          memberId
        );

        writeActiveCampaignMemberId(
          campaignId,
          memberId
        );
      },
      [
        core,
        campaignId,
      ]
    );


  const addPlayer =
    useCallback(
      (
        displayName: string,
        characterId?: string
      ) => {
        updateCampaignCore(
          (current) =>
            addCampaignPlayer(
              current,
              displayName,
              characterId
            )
        );
      },
      [
        updateCampaignCore,
      ]
    );


  const removePlayer =
    useCallback(
      (memberId: string) => {
        updateCampaignCore(
          (current) =>
            removeCampaignMember(
              current,
              memberId
            )
        );

        if (
          activeMemberId ===
          memberId
        ) {
          setActiveMemberId(
            "local-dm"
          );

          if (campaignId) {
            writeActiveCampaignMemberId(
              campaignId,
              "local-dm"
            );
          }
        }
      },
      [
        updateCampaignCore,
        activeMemberId,
        campaignId,
      ]
    );


  const renameMember =
    useCallback(
      (
        memberId: string,
        displayName: string
      ) => {
        updateCampaignCore(
          (current) =>
            renameCampaignMember(
              current,
              memberId,
              displayName
            )
        );
      },
      [
        updateCampaignCore,
      ]
    );


  const linkPlayerCharacter =
    useCallback(
      (
        memberId: string,
        characterId?: string
      ) => {
        updateCampaignCore(
          (current) =>
            linkMemberCharacter(
              current,
              memberId,
              characterId
            )
        );
      },
      [
        updateCampaignCore,
      ]
    );


  const setMemberPermissions =
    useCallback(
      (
        memberId: string,
        overrides:
          Partial<CampaignPermissions>
      ) => {
        updateCampaignCore(
          (current) =>
            updateMemberPermissions(
              current,
              memberId,
              overrides
            )
        );
      },
      [
        updateCampaignCore,
      ]
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

        setActiveMember,
        addPlayer,
        removePlayer,
        renameMember,
        linkPlayerCharacter,
        setMemberPermissions,
      }),
      [
        campaignId,
        core,
        currentMember,
        permissions,
        ready,
        updateCampaignCore,
        setActiveMember,
        addPlayer,
        removePlayer,
        renameMember,
        linkPlayerCharacter,
        setMemberPermissions,
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
