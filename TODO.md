# Pacem JS

## Improvements (to be done)
1. `viewActivatedCallback()` must be hit on a component only when all the descendant
components have already been templatified and view-activated!
2. Unify **adapter-registration pattern** under a generic system of types, see:
   - Map elements
   - 3D elements
   - Form field elements
3. **[DONE]**~~Change **gallery**/**carousel** structure to match the adapter-registration pattern. Remove dependency on
   datasource and its item types and thus from repeaters.~~
4. Deal with **CSP**.
5. Allow to set bindings programmatically (utility methods).
6. Improve transformation syntax (eg: `text="{{ #data.model |> highlight }}"`)