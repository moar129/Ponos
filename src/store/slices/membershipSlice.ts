import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { MembershipState, PendingMembershipRequest } from '../../types/membership/membershipType'

const initialState: MembershipState = {
    pendingRequest: null,
    // 'loading' som udgangspunkt: vi ved endnu ikke om der findes en
    // ventende anmodning, før vi har spurgt databasen så vi kan vise et banner et andet sted i appen
    status: 'loading',
}

const membershipSlice = createSlice({
    name: 'membership',
    initialState,
    reducers: {
        // Kaldes når vi har tjekket databasen og fundet svaret -
        // enten en ventende anmodning, eller null hvis der ingen er
        pendingRequestLoaded(state, action: PayloadAction<PendingMembershipRequest | null>) {
            state.pendingRequest = action.payload
            state.status = 'checked'
        },
        // Kaldes lige efter en ny anmodning er sendt (i RequestMembership.tsx),
        // så banneret kan vise den nye anmodning med det samme, uden at
        // skulle vente på et nyt databasekald
        pendingRequestSet(state, action: PayloadAction<PendingMembershipRequest>) {
            state.pendingRequest = action.payload
            state.status = 'checked'
        },
        // Kaldes når en anmodning bliver accepteret/afvist (fremtidig brug,
        // fx hvis vi bygger realtids-opdatering af US-07/US-08 senere)
        pendingRequestCleared(state) {
            state.pendingRequest = null
            state.status = 'checked'
        },
    },
})

export const { pendingRequestLoaded, pendingRequestSet, pendingRequestCleared } = membershipSlice.actions
export default membershipSlice.reducer