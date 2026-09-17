import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquareText, Plus } from 'lucide-react';
import { ConversationListComponent } from '../../components/messages/conversationListComponent';
import { ContactListComponent } from '../../components/messages/contactListComponent';
import { ConversationComponent } from '../../components/messages/conversationComponent';
import { GroupConversationComponent } from '../../components/messages/groupConversationComponent';
import { CreateGroupComponent } from '../../components/messages/createGroupComponent';
import { useGetMyConversationsQuery } from '../../store/apis/messageApi';
import { useGetOrganisationMembersQuery } from '../../store/apis/roleApi';
import { useGetMyProfileQuery } from '../../store/apis/profileApi';
import type { OrganisationMember } from '../../types/role/roleType';
import type { ConversationSummary } from '../../types/messages/messagesTypes';

type Tab = 'conversations' | 'contacts';

export function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('conversations');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<OrganisationMember | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ConversationSummary | null>(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const { data: conversations = [] } = useGetMyConversationsQuery();
  const { data: members = [] } = useGetOrganisationMembersQuery();
  const { data: myProfile } = useGetMyProfileQuery();

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
  // sin kontakt korrekt, før den vælges.
  useEffect(() => {
    const conversationParam = searchParams.get('conversation');
    if (!conversationParam) return;
    if (conversations.length === 0) return;

    const conversation = conversations.find((c) => c.conversationId === conversationParam);
    if (!conversation) return;
    if (!conversation.isGroup && members.length === 0) return;

    handleSelectConversation(conversationParam);
    setActiveTab('conversations');
    setSearchParams({}, { replace: true });
  }, [conversations, members, searchParams]);

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
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 h-[calc(100vh-220px)] min-h-[500px] min-w-0">
      <CreateGroupComponent
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onCreated={handleGroupCreated}
      />

      {/* VENSTRE SIDE */}
      <div className="md:col-span-4 lg:col-span-3 bg-white rounded-xl border border-border-gray shadow-sm overflow-hidden flex flex-col min-h-0 dark:bg-slate-800 dark:border-slate-700">
        {/* Faner */}
        <div className="flex border-b border-border-gray shrink-0 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('conversations')}
            className={`flex-1 px-3 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'conversations'
                ? 'text-accent border-b-2 border-accent'
                : 'text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            Samtaler
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 px-3 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'contacts'
                ? 'text-accent border-b-2 border-accent'
                : 'text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            Alle kontakter
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
              Ny gruppe
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
      <div className="md:col-span-8 lg:col-span-9 bg-white rounded-xl border border-border-gray shadow-sm overflow-hidden min-h-0 dark:bg-slate-800 dark:border-slate-700">
        {selectedContact ? (
          <ConversationComponent
            conversationId={selectedConversationId}
            contact={selectedContact}
            currentUserId={myProfile?.id ?? ''}
            onConversationCreated={handleConversationCreated}
          />
       ) : selectedGroup ? (
          <GroupConversationComponent
            conversationId={selectedGroup.conversationId}
            groupName={selectedGroup.displayName ?? 'Unavngivet gruppe'}
            currentUserId={myProfile?.id ?? ''}
            onLeft={() => {
              setSelectedGroup(null);
              setSelectedConversationId(null);
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center text-center text-secondary px-4 dark:text-slate-400">
              <MessageSquareText className="w-10 h-10 mb-3 stroke-[1.5] text-secondary dark:text-slate-400" />
              <p className="text-sm">
                Vælg en samtale, eller find en kollega under "Alle kontakter"
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}