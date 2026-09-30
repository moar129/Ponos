import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquareText, Plus } from 'lucide-react';
import { ConversationListComponent } from '../../components/messages/conversationListComponent';
import { ContactListComponent } from '../../components/messages/contactListComponent';
import { ConversationComponent } from '../../components/messages/conversationComponent';
import { GroupConversationComponent } from '../../components/messages/groupConversationComponent';
import { CreateGroupComponent } from '../../components/messages/createGroupComponent';
import { useGetMyConversationsQuery } from '../../store/apis/messageApi';
import { useGetOrganisationMembersQuery } from '../../store/apis/roleApi';
import { useGetMyProfileQuery } from '../../store/apis/profileApi';
import { EmptyState } from '../../components/common/EmptyState';
import type { OrganisationMember } from '../../types/role/roleType';
import type { ConversationSummary } from '../../types/messages/messagesTypes';

type Tab = 'conversations' | 'contacts';

export function MessagesPage() {
  const { t } = useTranslation(['messages', 'common'])
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('conversations');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<OrganisationMember | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ConversationSummary | null>(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const { data: conversations = [] } = useGetMyConversationsQuery();
  const { data: members = [] } = useGetOrganisationMembersQuery();
  const { data: myProfile } = useGetMyProfileQuery();

  // En opgave-chat arkiveres, når alle har valgt "Luk chat", og forsvinder
  // så fra listen - også mens den står åben. Afledt i stedet for et effect.
  const activeGroup =
    selectedGroup && conversations.some((c) => c.conversationId === selectedGroup.conversationId)
      ? selectedGroup
      : null;

  // Under md er der kun plads til ét panel ad gangen: listen, eller den
  // valgte samtale med en tilbage-knap.
  const hasSelection = !!selectedContact || !!activeGroup;

  const clearSelection = () => {
    setSelectedContact(null);
    setSelectedGroup(null);
    setSelectedConversationId(null);
  };

  const handleSelectConversation = (conversationId: string) => {
    const conversation = conversations.find((c) => c.conversationId === conversationId);
    if (!conversation) return;

    setSelectedConversationId(conversationId);

    if (conversation.isGroup) {
      setSelectedGroup(conversation);
      setSelectedContact(null);
      return;
    }

    const contact = members.find((member) => member.id === conversation.otherUserId);
    setSelectedContact(contact ?? null);
    setSelectedGroup(null);
  };

  // Åbner den samtale, en notifikations-link peger på (?conversation=<id>).
  // Venter på både samtale- og medlemslisten, så en 1:1-samtale kan finde
  // sin kontakt korrekt, før den vælges. Valget sker under render (med
  // handledLink som vagt) i stedet for i et effect, så siden ikke først
  // tegnes uden valgt samtale.
  const conversationParam = searchParams.get('conversation');
  const linkedConversation = conversationParam
    ? conversations.find((c) => c.conversationId === conversationParam)
    : undefined;
  const isLinkReady = !!linkedConversation && (linkedConversation.isGroup || members.length > 0);
  const [handledLink, setHandledLink] = useState<string | null>(null);

  if (isLinkReady && conversationParam !== handledLink) {
    setHandledLink(linkedConversation.conversationId);
    handleSelectConversation(linkedConversation.conversationId);
    setActiveTab('conversations');
  } else if (!conversationParam && handledLink) {
    // Klar til samme link igen (fx samme notifikation klikket to gange).
    setHandledLink(null);
  }

  // Fjern parameteren fra URL'en, når samtalen er valgt.
  useEffect(() => {
    if (isLinkReady) setSearchParams({}, { replace: true });
  }, [isLinkReady, setSearchParams]);

  const handleSelectContact = (contact: OrganisationMember) => {
    const conversation = conversations.find((c) => c.otherUserId === contact.id && !c.isGroup);
    setSelectedContact(contact);
    setSelectedGroup(null);
    setSelectedConversationId(conversation?.conversationId ?? null);
  };

  const handleConversationCreated = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  const handleGroupCreated = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setSelectedContact(null);
    setSelectedGroup(null);
    setActiveTab('conversations');
    // selectedGroup sættes ikke direkte her - den fulde gruppe-info
    // (navn, deltagerantal) findes først, når useGetMyConversationsQuery
    // refetcher (den er allerede invalideret af createGroupConversation).
    // Brugeren ser highlighten i ConversationListComponent, så snart
    // listen opdaterer sig.
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 h-[calc(100dvh-140px)] lg:h-[calc(100vh-200px)] min-h-[420px] min-w-0">
      {isCreateGroupOpen && (
        <CreateGroupComponent onClose={() => setIsCreateGroupOpen(false)} onCreated={handleGroupCreated} />
      )}

      {/* VENSTRE SIDE */}
      <div className={`${hasSelection ? 'hidden md:flex' : 'flex'} md:col-span-5 lg:col-span-4 2xl:col-span-3 bg-white rounded-xl border border-border-gray shadow-sm overflow-hidden flex-col min-h-0 dark:bg-slate-800 dark:border-slate-700`}>
        {/* Faner */}
        <div className="flex border-b border-border-gray shrink-0 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('conversations')}
            className={`flex-1 min-w-0 truncate whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'conversations'
                ? 'text-accent border-b-2 border-accent'
                : 'text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            {t('conversations')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 min-w-0 truncate whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'contacts'
                ? 'text-accent border-b-2 border-accent'
                : 'text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            {t('allContacts')}
          </button>
        </div>

        {/* Ny gruppe-knap - kun relevant på Samtaler-fanen */}
        {activeTab === 'conversations' && (
          <div className="p-3 border-b border-border-gray shrink-0 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsCreateGroupOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-bg-gray hover:bg-border-gray text-primary text-sm font-medium transition-colors border border-border-gray dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100 dark:border-slate-700"
            >
              <Plus className="w-4 h-4" />
              {t('newGroup')}
            </button>
          </div>
        )}

        {/* Liste */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === 'conversations' ? (
            <ConversationListComponent
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
            />
          ) : (
            <ContactListComponent
              selectedContactId={selectedContact?.id ?? null}
              onSelectContact={handleSelectContact}
            />
          )}
        </div>
      </div>

      {/* SAMTALE / GRUPPE */}
      <div className={`${hasSelection ? 'flex' : 'hidden md:flex'} flex-col md:col-span-7 lg:col-span-8 2xl:col-span-9 bg-white rounded-xl border border-border-gray shadow-sm overflow-hidden min-h-0 dark:bg-slate-800 dark:border-slate-700`}>
        {hasSelection && (
          <button
            type="button"
            onClick={clearSelection}
            className="md:hidden flex items-center gap-2 px-4 py-2.5 border-b border-border-gray text-sm font-medium text-secondary hover:text-primary shrink-0 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToConversations')}
          </button>
        )}
        <div className="flex-1 min-h-0">
        {selectedContact ? (
          <ConversationComponent
            conversationId={selectedConversationId}
            contact={selectedContact}
            currentUserId={myProfile?.id ?? ''}
            onConversationCreated={handleConversationCreated}
          />
       ) : activeGroup ? (
          <GroupConversationComponent
            conversationId={activeGroup.conversationId}
            groupName={activeGroup.displayName ?? t('unnamedGroup')}
            currentUserId={myProfile?.id ?? ''}
            onLeft={() => {
              setSelectedGroup(null);
              setSelectedConversationId(null);
            }}
          />
        ) : (
          <EmptyState icon={MessageSquareText} title={t('chooseConversation')} className="h-full" />
        )}
        </div>
      </div>
    </div>
  );
}